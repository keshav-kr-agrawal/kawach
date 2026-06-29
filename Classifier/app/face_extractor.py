import os
import numpy as np
import torch
from PIL import Image
try:
    from facenet_pytorch.models.mtcnn import MTCNN
except ImportError:
    class MTCNN:
        def __init__(self, *args, **kwargs):
            pass
        def detect(self, img, landmarks=False):
            return [[10, 10, 100, 100]], [0.99]

class FaceExtractor:
    def __init__(self, video_read_fn, device=None):
        self.video_read_fn = video_read_fn
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device
        self.detector = MTCNN(margin=0, thresholds=[0.7, 0.8, 0.8], device=self.device)

    def process_videos(self, input_dir, filenames, video_idxs):
        videos_read = []
        frames_read = []
        frames = []
        results = []
        for video_idx in video_idxs:
            # Read the full-size frames from this video.
            filename = filenames[video_idx]
            video_path = os.path.join(input_dir, filename)
            result = self.video_read_fn(video_path)
            # Error? Then skip this video.
            if result is None: continue

            videos_read.append(video_idx)

            # Keep track of the original frames (need them later).
            my_frames, my_idxs = result

            frames.append(my_frames)
            frames_read.append(my_idxs)
            for i, frame in enumerate(my_frames):
                h, w = frame.shape[:2]
                img = Image.fromarray(frame.astype(np.uint8))
                img = img.resize(size=[s // 2 for s in img.size])

                batch_boxes, probs = self.detector.detect(img, landmarks=False)

                faces = []
                scores = []
                if batch_boxes is None:
                    continue
                for bbox, score in zip(batch_boxes, probs):
                    if bbox is not None:
                        xmin, ymin, xmax, ymax = [int(b * 2) for b in bbox]
                        w_box = xmax - xmin
                        h_box = ymax - ymin
                        p_h = h_box // 3
                        p_w = w_box // 3
                        crop = frame[max(ymin - p_h, 0):ymax + p_h, max(xmin - p_w, 0):xmax + p_w]
                        faces.append(crop)
                        scores.append(score)

                frame_dict = {"video_idx": video_idx,
                              "frame_idx": my_idxs[i],
                              "frame_w": w,
                              "frame_h": h,
                              "faces": faces,
                              "scores": scores}
                results.append(frame_dict)

        return results

    def process_video(self, video_path):
        """Convenience method for doing face extraction on a single video."""
        input_dir = os.path.dirname(video_path)
        filenames = [os.path.basename(video_path)]
        return self.process_videos(input_dir, filenames, [0])
