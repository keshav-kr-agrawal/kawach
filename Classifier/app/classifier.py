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

def predict_on_video(face_extractor, video_path, batch_size, input_size, models, strategy=confident_strategy,
                     apply_compression=False, device=None):
    if device is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"

    batch_size_limit = batch_size * 4
    try:
        faces = face_extractor.process_video(video_path)
        faces_detected = 0
        frames_analyzed = len(faces)
        
        if len(faces) > 0:
            x = np.zeros((batch_size_limit, input_size, input_size, 3), dtype=np.uint8)
            n = 0
            for frame_data in faces:
                faces_detected += len(frame_data["faces"])
                for face in frame_data["faces"]:
                    resized_face = isotropically_resize_image(face, input_size)
                    resized_face = put_to_center(resized_face, input_size)
                    if apply_compression:
                        resized_face = image_compression(resized_face, quality=90, image_type=".jpg")
                    if n < batch_size_limit:
                        x[n] = resized_face
                        n += 1
            if n > 0:
                x_tensor = torch.tensor(x, device=device).float()
                # Preprocess the images.
                x_tensor = x_tensor.permute((0, 3, 1, 2))
                for i in range(len(x_tensor)):
                    x_tensor[i] = normalize_transform(x_tensor[i] / 255.)
                
                # Make a prediction, then take the average.
                with torch.no_grad():
                    preds = []
                    for model in models:
                        model_input = x_tensor[:n].half() if device == "cuda" else x_tensor[:n].float()
                        y_pred = model(model_input)
                        y_pred = torch.sigmoid(y_pred)
                        bpred = y_pred.view(-1).cpu().numpy()
                        preds.append(strategy(bpred))
                    return float(np.mean(preds)), faces_detected, frames_analyzed
    except Exception as e:
        print("Prediction error on video %s: %s" % (video_path, str(e)))

    return 0.5, 0, 0
