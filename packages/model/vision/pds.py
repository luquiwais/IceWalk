"""Lectura de labels PDS de HiRISE: geometría del sol y proyección.

Sol e incidencia salen siempre del label, nunca fijos en el código: así el pipeline sirve para
otro sitio. Los archivos descargados se tratan como datos no confiables: si falta un campo o no
se puede interpretar, falla en vez de asumir un valor.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from pathlib import Path

_FIELD = re.compile(r"^\s*([A-Z_]+)\s*=\s*\"?([^\"<\r\n]+?)\"?\s*(?:<[^>]*>)?\s*$", re.MULTILINE)
_REQUIRED_NUMBERS = (
    "MAP_SCALE",
    "A_AXIS_RADIUS",
    "CENTER_LATITUDE",
    "CENTER_LONGITUDE",
    "INCIDENCE_ANGLE",
    "SUB_SOLAR_AZIMUTH",
    "NORTH_AZIMUTH",
)


@dataclass(frozen=True)
class ImageGeometry:
    product_id: str
    start_time: str
    projection: str
    map_scale_m: float
    radius_m: float
    center_lat_deg: float
    center_lon_deg: float
    incidence_deg: float
    sun_azimuth_deg: float
    """Dirección desde la que llega el sol, en grados desde el norte, sentido horario."""

    @property
    def shadow_azimuth_deg(self) -> float:
        """Hacia dónde apuntan las sombras."""
        return (self.sun_azimuth_deg + 180.0) % 360.0

    @property
    def shadow_per_height(self) -> float:
        """Metros de sombra por metro de altura, sobre terreno plano: tan(incidencia)."""
        return math.tan(math.radians(self.incidence_deg))

    def height_from_shadow(self, shadow_length_m: float) -> float:
        return shadow_length_m / self.shadow_per_height


def parse_label(text: str, product_id: str = "") -> ImageGeometry:
    """Interpreta el texto de un label. Se queda con la primera aparición de cada campo."""
    fields: dict[str, str] = {}
    for key, value in _FIELD.findall(text):
        fields.setdefault(key, value.strip())

    missing = [key for key in _REQUIRED_NUMBERS if key not in fields]
    if missing:
        raise ValueError(f"Label sin campos requeridos: {missing}")
    try:
        values = {key: float(fields[key]) for key in _REQUIRED_NUMBERS}
    except ValueError as error:
        raise ValueError(f"Label con un valor no numérico: {error}") from error

    if not 0 <= values["INCIDENCE_ANGLE"] < 90:
        raise ValueError(f"Incidencia sin sol sobre el horizonte: {values['INCIDENCE_ANGLE']}")

    # Los azimuts del label se miden en sentido horario desde el eje +x de la imagen.
    sun_azimuth = (values["SUB_SOLAR_AZIMUTH"] - values["NORTH_AZIMUTH"]) % 360.0
    return ImageGeometry(
        product_id=product_id or fields.get("PRODUCT_ID", ""),
        start_time=fields.get("START_TIME", ""),
        projection=fields.get("MAP_PROJECTION_TYPE", ""),
        map_scale_m=values["MAP_SCALE"],
        radius_m=values["A_AXIS_RADIUS"] * 1000.0,  # El label lo da en km.
        center_lat_deg=values["CENTER_LATITUDE"],
        center_lon_deg=values["CENTER_LONGITUDE"],
        incidence_deg=values["INCIDENCE_ANGLE"],
        sun_azimuth_deg=sun_azimuth,
    )


def read_label(path: Path) -> ImageGeometry:
    text = path.read_text(encoding="latin-1")  # Los labels PDS son ASCII; latin-1 nunca falla.
    return parse_label(text, product_id=path.name.removesuffix(".LBL"))
