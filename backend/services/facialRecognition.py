import torch
import torch.nn.functional as F
from facenet_pytorch import MTCNN, InceptionResnetV1
import numpy as np
import cv2
from lib.MiniFASNet import MiniFASNetV2
from services.mongodb_service import get_face_embedding


FACIALRECOGNITION_THRESHOLD = 0.75  # You can tune this

LIVENESS_MODEL_PATH = "./pretrained_models/2.7_80x80_MiniFASNetV2.pth"
LIVENESS_THRESHOLD = 0.75  # High confidence threshold for "Real"

# Database = Database()




def crop_face_with_scale(img, box, scale=2.7):
    """
    Crops a face with a specific scale.
    If the crop goes outside the image, it pads with black (0)
    instead of crashing or shrinking the scale.
    """
    h_img, w_img = img.shape[:2]
    x1, y1, x2, y2 = box

    # 1. Calculate the center of the face
    cx = (x1 + x2) // 2
    cy = (y1 + y2) // 2

    # 2. Calculate the new size (2.7x the largest dimension of the face)
    #    We use max(w, h) to keep the crop square
    face_w = x2 - x1
    face_h = y2 - y1
    new_size = int(max(face_w, face_h) * scale)

    # 3. Calculate new coordinates relative to the image
    x_min = cx - new_size // 2
    y_min = cy - new_size // 2
    x_max = x_min + new_size
    y_max = y_min + new_size

    #    Take the valid crop from the original image
    #    (Clip coordinates to be within image bounds)
    crop_y1 = max(0, y_min)
    crop_y2 = min(h_img, y_max)
    crop_x1 = max(0, x_min)
    crop_x2 = min(w_img, x_max)

    face_crop = img[crop_y1:crop_y2, crop_x1:crop_x2]
    return face_crop


def calculate_embedding_distance(emb1, emb2):
    distance = np.linalg.norm(emb1 - emb2)
    return distance


class FaceRecognition:
    def __init__(self):
        # --- 1. Setup Device (CUDA) ---
        self.device = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')
        print(f"Running on device: {self.device}")

        # --- 2. Initialize Models ---
        # MTCNN: Face Detector & Aligner
        self.mtcnn = MTCNN(
            image_size=160,  # FaceNet default input size
            margin=0,  # Margin around the face
            keep_all=False,  # We only want the main face for verification
            select_largest=True,
            device=self.device
        )

        # InceptionResnetV1: Face Recognition Model
        self.resnet = InceptionResnetV1(pretrained='vggface2').eval().to(self.device)

        self.liveness_model = MiniFASNetV2(conv6_kernel=(5, 5)).to(self.device)
        state_dict = torch.load(LIVENESS_MODEL_PATH, map_location=self.device)
        # Fix key names if they have 'module.' prefix (common in DataParallel training)
        new_state_dict = {k.replace('module.', ''): v for k, v in state_dict.items()}
        self.liveness_model.load_state_dict(new_state_dict)
        self.liveness_model.eval()

    def get_embedding(self, img):
        """
        Detects a face, aligns it, and generates the embedding.
        """

        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # Step A: Detect & Crop (MTCNN)
        # This returns a pre-processed tensor (C x H x W)
        # If no face is found, it returns None
        img_cropped = self.mtcnn(img)

        if img_cropped is None:
            print(f"No face detected.")
            return None

        # Step B: Generate Embedding (FaceNet)
        # Input: (1, 3, 160, 160) -> Output: (1, 512)
        with torch.no_grad():
            # Add batch dimension (unsqueeze) and move to GPU
            img_embedding = self.resnet(img_cropped.unsqueeze(0).to(self.device))

        # Detach from GPU and convert to numpy for easy comparison
        return img_embedding.cpu().detach().numpy()[0]

    def detect_largest_face(self, img):

        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        boxes, _ = self.mtcnn.detect(img)
        if boxes is None:
            return None
        # Find the largest box
        largest_box = max(boxes, key=lambda box: (box[2]-box[0]) * (box[3]-box[1]))
        x1, y1, x2, y2 = map(int, largest_box)
        return (x1, y1, x2, y2)

    def is_live_face(self, face):
        """
        Check if the given face image is live or spoofed.
        """
        x1, y1, x2, y2 = self.detect_largest_face(face)

        face = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)

        if x1 is None:
            return False  # No face detected
        face_crop = crop_face_with_scale(face, (x1, y1, x2, y2), scale=2.7)
        if face_crop.size == 0:
            return False
        face_resized = cv2.resize(face_crop, (80, 80))
        face_tensor = torch.from_numpy(face_resized).permute(2, 0, 1).float()
        face_tensor = face_tensor.unsqueeze(0).to(self.device)

        with torch.no_grad():
            liveness_score = self.liveness_model(face_tensor)
            liveness_prob = F.softmax(liveness_score, dim=1).cpu().numpy()[0]

        score_real = liveness_prob[1]
        print(score_real)
        return score_real >= LIVENESS_THRESHOLD


    def compare_embeddings(self, ic_img, face):
        ic_x1, ic_y1, ic_x2, ic_y2 = self.detect_largest_face(ic_img)
        face_x1, face_y1, face_x2, face_y2 = self.detect_largest_face(face)

        if ic_x1 is None or face_x1 is None:
            print("Face not detected in one of the images.")
            return None

        if not self.is_live_face(face):
            print("The live face image is detected as spoofed.")
            return None

        ic_crop = crop_face_with_scale(ic_img, (ic_x1, ic_y1, ic_x2, ic_y2), scale=2.7)
        face_crop = crop_face_with_scale(face, (face_x1, face_y1, face_x2, face_y2), scale=2.7)

        emb1 = self.get_embedding(ic_crop)
        emb2 = self.get_embedding(face_crop)

        if emb1 is None or emb2 is None:
            print("Failed to get embeddings.")
            return None

        distance = calculate_embedding_distance(emb1, emb2)
        print(distance)
        if distance < FACIALRECOGNITION_THRESHOLD:
            return emb2
        else:
            print(f"Faces do not match. Distance: {distance:.4f}.")
            return None

    def verify_face(self, face, nric):
        emb_stored = self.load_embedding(nric)

        face_x1, face_y1, face_x2, face_y2 = self.detect_largest_face(face)

        if face_x1 is None:
            print("Face not detected in the image.")
            return False

        face_crop = crop_face_with_scale(face, (face_x1, face_y1, face_x2, face_y2), scale=2.7)

        emb_live = self.get_embedding(face_crop)

        if emb_live is None:
            print("Failed to get embedding for live face.")
            return False

        distance = calculate_embedding_distance(emb_stored, emb_live)

        if distance < FACIALRECOGNITION_THRESHOLD:
            return True
        else:
            print(f"Faces do not match. Distance: {distance:.4f}.")
            return False

    def load_embedding(self, nric: str) -> np.ndarray:
        """
        Load a single embedding from a JSON file.
        """
        embedding = get_face_embedding(nric)
        if embedding is None:
            raise ValueError(f"No embedding found for NRIC: {nric}")
        return np.array(embedding, dtype=np.float32)





