import numpy as np
import torch
import cv2
from torchvision.transforms import Normalize
try:
    from albumentations.augmentations.functional import image_compression
except ImportError:
    try:
        from albumentations.functional import image_compression
    except ImportError:
        def image_compression(img, *args, **kwargs):
            return img

mean = [0.485, 0.456, 0.406]
std = [0.229, 0.224, 0.225]
normalize_transform = Normalize(mean, std)

def confident_strategy(pred, t=0.8):
    pred = np.array(pred)
    sz = len(pred)
    fakes = np.count_nonzero(pred > t)
    # If >40% of frames are fake and we have at least 11 fake frames
    if fakes > sz // 2.5 and fakes > 11:
        return np.mean(pred[pred > t])
    elif np.count_nonzero(pred < 0.2) > 0.9 * sz:
        return np.mean(pred[pred < 0.2])
    else:
        return np.mean(pred)

def put_to_center(img, input_size):
    img = img[:input_size, :input_size]
    image = np.zeros((input_size, input_size, 3), dtype=np.uint8)
    start_w = (input_size - img.shape[1]) // 2
    start_h = (input_size - img.shape[0]) // 2
    image[start_h:start_h + img.shape[0], start_w: start_w + img.shape[1], :] = img
    return image

def isotropically_resize_image(img, size, interpolation_down=cv2.INTER_AREA, interpolation_up=cv2.INTER_CUBIC):
    h, w = img.shape[:2]
    if max(w, h) == size:
        return img
    if w > h:
        scale = size / w
        h = h * scale
        w = size
    else:
        scale = size / h
        w = w * scale
        h = size
    interpolation = interpolation_up if scale > 1 else interpolation_down
    resized = cv2.resize(img, (int(w), int(h)), interpolation=interpolation)
    return resized

import os

# Inference chunk size: how many face crops go through the B7 ensemble at
# once. Chunking changes peak memory only, never the prediction (same faces,
# same averaging strategy). 8 keeps a dual-B7 pass under ~2GB on CPU; raise it
# via env on machines with headroom.
INFER_CHUNK = int(os.environ.get("INFER_BATCH_SIZE", "8"))


def predict_on_video(face_extractor, video_path, batch_size, input_size, models, strategy=confident_strategy,
                     apply_compression=False, device=None):
    if device is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"

    max_faces = batch_size * 4
    try:
        faces = face_extractor.process_video(video_path)
        faces_detected = 0
        frames_analyzed = len(faces)

        if len(faces) > 0:
            crops = []
            for frame_data in faces:
                faces_detected += len(frame_data["faces"])
                for face in frame_data["faces"]:
                    if len(crops) >= max_faces:
                        continue
                    resized_face = isotropically_resize_image(face, input_size)
                    resized_face = put_to_center(resized_face, input_size)
                    if apply_compression:
                        resized_face = image_compression(resized_face, quality=90, image_type=".jpg")
                    crops.append(resized_face)

            n = len(crops)
            if n > 0:
                x = np.stack(crops)  # only actual faces — no fixed 128-slot buffer
                with torch.no_grad():
                    preds = []
                    for model in models:
                        frame_preds = []
                        # Chunked inference: identical output to a single big
                        # batch, but peak memory stays bounded on 8GB machines
                        # and free-tier CPU hosts.
                        for start in range(0, n, INFER_CHUNK):
                            chunk = torch.tensor(x[start:start + INFER_CHUNK], device=device).float()
                            chunk = chunk.permute((0, 3, 1, 2))
                            for i in range(len(chunk)):
                                chunk[i] = normalize_transform(chunk[i] / 255.)
                            model_input = chunk.half() if device == "cuda" else chunk.float()
                            y_pred = torch.sigmoid(model(model_input))
                            frame_preds.extend(y_pred.view(-1).cpu().numpy().tolist())
                            del chunk, model_input, y_pred
                        preds.append(strategy(np.array(frame_preds)))
                    return float(np.mean(preds)), faces_detected, frames_analyzed
    except Exception as e:
        print("Prediction error on video %s: %s" % (video_path, str(e)))

    return 0.5, 0, 0
