"""Hora solar y posición del Sol en Marte: algoritmo de Mars24 (NASA GISS).

Allison y McEwen (2000), Planetary and Space Science 48, 215-235; pasos y ejemplos resueltos en
https://www.giss.nasa.gov/tools/mars24/help/algorithm.html. Los nombres de los pasos (A-1, B-1...)
son los de esa página. Longitudes al este en la interfaz; Mars24 usa longitud oeste.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

# A-4: TT - UTC = (TAI - UTC) + 32.184 s. TAI - UTC = 37 s desde el 1 de enero de 2017, sin
# segundos intercalares posteriores (IERS).
TT_MINUS_UTC_S = 69.184
SOL_S = 88775.244  # duración del día solar medio de Marte
# Radios del elipsoide de Marte (IAU) para pasar latitud planetocéntrica a planetográfica.
EQUATORIAL_KM, POLAR_KM = 3396.19, 3376.20
LS_PERIHELION_DEG = 251.0  # Ls = alpha_FMS + (nu - M), y alpha_FMS - M = 251.0 (B-1, B-2)

_PBS = (  # B-3: perturbadores (A, tau, phi)
    (0.0071, 2.2353, 49.409), (0.0057, 2.7543, 168.173), (0.0039, 1.1177, 191.837),
    (0.0037, 15.7866, 21.736), (0.0021, 2.1354, 15.704), (0.0020, 2.4694, 95.528),
    (0.0018, 32.8493, 49.095),
)


def _sin(deg: float) -> float:
    return math.sin(math.radians(deg))


def _cos(deg: float) -> float:
    return math.cos(math.radians(deg))


@dataclass(frozen=True)
class MarsTime:
    ls_deg: float  # longitud solar areocéntrica (estación)
    mst_h: float  # hora solar media en el meridiano 0
    ltst_h: float  # hora solar verdadera local
    lmst_h: float  # hora solar media local
    declination_deg: float
    sun_elevation_deg: float
    sun_azimuth_deg: float


def j2000_tt_days(t: datetime) -> float:
    """A-1 a A-6: días TT desde J2000."""
    if t.tzinfo is None:
        raise ValueError("Se espera una fecha con zona horaria (UTC)")
    jd_ut = 2440587.5 + t.timestamp() / 86400.0
    return jd_ut + TT_MINUS_UTC_S / 86400.0 - 2451545.0


def equation_of_center(m_deg: float, dt: float = 0.0) -> float:
    """B-4 sin perturbadores: nu - M en grados."""
    return ((10.691 + 3.0e-7 * dt) * _sin(m_deg) + 0.623 * _sin(2 * m_deg)
            + 0.050 * _sin(3 * m_deg) + 0.005 * _sin(4 * m_deg) + 0.0005 * _sin(5 * m_deg))


def equation_of_time_deg(ls_deg: float, nu_minus_m: float) -> float:
    """C-1: ecuación del tiempo (grados; 15° = 1 h)."""
    return (2.861 * _sin(2 * ls_deg) - 0.071 * _sin(4 * ls_deg) + 0.002 * _sin(6 * ls_deg)
            - nu_minus_m)


def equation_of_time_from_ls(ls_deg: float) -> float:
    """Ecuación del tiempo (grados) para una estación, sin fecha: para datos que solo traen Ls.

    Anomalía verdadera nu = Ls - 251°; M se despeja de nu - M = ecuación del centro.
    """
    nu = ls_deg - LS_PERIHELION_DEG
    m = nu
    for _ in range(8):
        m = nu - equation_of_center(m)
    return equation_of_time_deg(ls_deg, nu - m)


def planetographic_lat(lat_centric_deg: float) -> float:
    k = (EQUATORIAL_KM / POLAR_KM) ** 2
    return math.degrees(math.atan(k * math.tan(math.radians(lat_centric_deg))))


def mars_time(t: datetime, lon_east_deg: float, lat_centric_deg: float) -> MarsTime:
    dt = j2000_tt_days(t)
    m = 19.3871 + 0.52402073 * dt  # B-1
    a_fms = 270.3871 + 0.524038496 * dt  # B-2
    pbs = sum(a * _cos(0.985626 * dt / tau + phi) for a, tau, phi in _PBS)  # B-3
    nu_m = equation_of_center(m, dt) + pbs  # B-4
    ls = (a_fms + nu_m) % 360.0  # B-5
    eot = equation_of_time_deg(ls, nu_m)  # C-1
    jd_tt = dt + 2451545.0
    mst = (24.0 * ((jd_tt - 2451549.5) / 1.0274912517 + 44796.0 - 0.0009626)) % 24.0  # C-2
    lon_west = (360.0 - lon_east_deg) % 360.0
    lmst = (mst - lon_west / 15.0) % 24.0  # C-3
    ltst = (lmst + eot / 15.0) % 24.0  # C-4
    sub_lon = mst * 15.0 + eot + 180.0  # C-5 (oeste)
    dec = math.degrees(math.asin(0.42565 * _sin(ls))) + 0.25 * _sin(ls)  # D-1
    lat = planetographic_lat(lat_centric_deg)
    h = lon_west - sub_lon  # D-5
    cos_z = _sin(dec) * _sin(lat) + _cos(dec) * _cos(lat) * _cos(h)
    z = math.degrees(math.acos(max(-1.0, min(1.0, cos_z))))
    az = math.degrees(math.atan2(_sin(h), _cos(lat) * math.tan(math.radians(dec))
                                 - _sin(lat) * _cos(h))) % 360.0  # D-6
    return MarsTime(ls, mst, ltst, lmst, dec, 90.0 - z, az)


def next_ltst(t: datetime, ltst_h: float, lon_east_deg: float, lat_deg: float) -> datetime:
    """Primer instante a partir de `t` con esa hora solar verdadera local."""
    now = mars_time(t, lon_east_deg, lat_deg).ltst_h
    out = t + timedelta(seconds=((ltst_h - now) % 24.0) / 24.0 * SOL_S)
    for _ in range(3):  # la ecuación del tiempo cambia poco en un sol: dos o tres pasos alcanzan
        err = (ltst_h - mars_time(out, lon_east_deg, lat_deg).ltst_h + 12.0) % 24.0 - 12.0
        out += timedelta(seconds=err / 24.0 * SOL_S)
    return out


def utc(text: str | None) -> datetime:
    """ISO 8601 a datetime con zona (UTC si no trae); None = ahora."""
    if not text:
        return datetime.now(UTC)
    t = datetime.fromisoformat(text.replace("Z", "+00:00"))
    return t if t.tzinfo else t.replace(tzinfo=UTC)
