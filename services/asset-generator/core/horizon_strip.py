"""Build a reviewable L2 layer from a separately generated, uncropped strip."""

from PIL import Image

CANVAS = (480, 270)
STRIP_SIZE = (480, 34)
TOP = 70


def place_horizon_strip(source: Image.Image) -> Image.Image:
    """Place an opaque strip without cropping or stretching its aspect ratio."""
    image = source.convert("RGBA")
    if image.getchannel("A").getextrema() != (255, 255):
        raise ValueError("Horizon strip must be fully opaque")
    expected = STRIP_SIZE[0] / STRIP_SIZE[1]
    if abs(image.width / image.height / expected - 1.0) > 0.01:
        raise ValueError("Horizon strip aspect ratio differs from target by more than 1%")
    scaled = image.resize(STRIP_SIZE, Image.Resampling.NEAREST)
    layer = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    layer.paste(scaled, (0, TOP))
    return layer
