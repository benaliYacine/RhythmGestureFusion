# hand_gesture_predictor.py

import torch
import torch.nn as nn
import numpy as np
from PIL import Image
from torchvision import models, transforms


class HandGestureEnsemblePredictor:
    def __init__(
        self,
        model_paths: dict,
        num_classes: int = 14,
        input_size: int = 256,
        device: str = None,
    ):
        """
        model_paths: dict mapping model_name → checkpoint_path, e.g.
            {
              "vgg16": "./models/gesture_vgg16_epoch_10.pth",
              "vgg19": "./models/gesture_vgg19_epoch_4.pth",
              "mobilenet": "./models/gesture_mobilenet_epoch_10.pth",
              "mobilenet_v2": "./models/gesture_mobilenet_v2_epoch_9.pth",
            }
        """
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        # same transforms you used for validation
        self.transform = transforms.Compose(
            [
                transforms.Resize(input_size),
                transforms.CenterCrop(input_size),
                transforms.ToTensor(),
                transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225)),
            ]
        )

        # load each base model
        self.models = []
        for name, path in model_paths.items():
            net = self._create_model(name, num_classes)
            state = torch.load(path, map_location=self.device)
            net.load_state_dict(state)
            net.to(self.device).eval()
            self.models.append(net)

    def _create_model(self, name: str, num_classes: int, pretrained: bool = False):
        # exactly as in ensemble_dirichlet.py
        if name == "vgg16":
            net = models.vgg16(
                weights=models.VGG16_Weights.IMAGENET1K_V1 if pretrained else None
            )
            net.classifier[6] = nn.Linear(4096, num_classes)
        elif name == "vgg19":
            net = models.vgg19(
                weights=models.VGG19_Weights.IMAGENET1K_V1 if pretrained else None
            )
            net.classifier[6] = nn.Linear(4096, num_classes)
        elif name == "mobilenet":
            net = models.mobilenet_v3_large(
                weights=(
                    models.MobileNet_V3_Large_Weights.IMAGENET1K_V1
                    if pretrained
                    else None
                )
            )
            net.classifier[3] = nn.Linear(net.classifier[3].in_features, num_classes)
        elif name == "mobilenet_v2":
            net = models.mobilenet_v2(
                weights=(
                    models.MobileNet_V2_Weights.IMAGENET1K_V1 if pretrained else None
                )
            )
            # replace last layer
            if isinstance(net.classifier, nn.Sequential):
                net.classifier[-1] = nn.Linear(
                    net.classifier[-1].in_features, num_classes
                )
            else:
                net.classifier = nn.Linear(net.last_channel, num_classes)
        else:
            raise ValueError(f"Unknown model name: {name}")
        return net

    def _get_probs(self, x: torch.Tensor) -> np.ndarray:
        # x shape: (1,3,H,W)
        out = []
        with torch.no_grad():
            for m in self.models:
                logits = m(x.to(self.device))
                p = nn.functional.softmax(logits, dim=1)
                out.append(p.cpu().numpy().ravel())
        return np.stack(out)  # shape (4, num_classes)

    def _estimate_alpha(self, probs: np.ndarray) -> np.ndarray:
        # moment-matching Dirichlet
        m = probs.mean(axis=0)
        v = probs.var(axis=0) + 1e-8
        S = (m * (1 - m) / v) - 1
        alpha0 = max(S.mean(), 1e-6)
        return m * alpha0

    def predict(self, image_path: str):
        """
        Returns:
          pred_class (int),
          expected_probs (np.ndarray, shape [num_classes]),
          confidence (float == α₀)
        """
        img = Image.open(image_path).convert("RGB")
        x = self.transform(img).unsqueeze(0)  # (1,3,H,W)
        probs = self._get_probs(x)
        alpha = self._estimate_alpha(probs)
        alpha0 = float(alpha.sum())
        expected = alpha / alpha0
        return int(expected.argmax()), expected, alpha0


if __name__ == "__main__":
    # example usage
    paths = {
        "vgg16": "./models/gesture_vgg16_epoch_10.pth",
        "vgg19": "./models/gesture_vgg19_epoch_4.pth",
        "mobilenet": "./models/gesture_mobilenet_epoch_10.pth",
        "mobilenet_v2": "./models/gesture_mobilenet_v2_epoch_9.pth",
    }
    predictor = HandGestureEnsemblePredictor(paths)
    img_path = "./data/val/Gesture_3/3058.jpg"
    cls, probs, conf = predictor.predict(img_path)
    print(f"Predicted: Gesture_{cls}  confidence α₀={conf:.1f}")
    print("Class probs:", np.round(probs, 3))

    img_path = "./data/val/Gesture_3/3067.jpg"
    cls, probs, conf = predictor.predict(img_path)
    print(f"Predicted: Gesture_{cls}  confidence α₀={conf:.1f}")
    print("Class probs:", np.round(probs, 3))

    img_path = "./data/val/Gesture_3/3077.jpg"
    cls, probs, conf = predictor.predict(img_path)
    print(f"Predicted: Gesture_{cls}  confidence α₀={conf:.1f}")
    print("Class probs:", np.round(probs, 3))
