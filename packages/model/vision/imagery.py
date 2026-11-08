"""Utilidades para imágenes HiRISE."""

from __future__ import annotations

import numpy as np


def valid_mask(image: np.ndarray) -> np.ndarray:
    """True donde hay dato. En los JP2 de HiRISE, 0 es sin dato.

    Además del marco de la huella rotada, hay líneas finas de valor 0 que cruzan la imagen. Son
    oscuras y alargadas como una sombra, así que el detector tiene que excluirlas antes de buscar
    sombras: en ESP_073578_2155 ocupan ~0.02 % de los píxeles interiores, pero engañan a un filtro
    simple de contraste.
    """
    return image > 0
