"""Mapas de hielo para la web: grilla, capas, actualización por ventana, formato y colores."""

import json
import struct
import zlib
from pathlib import Path

import jsonschema
import numpy as np
import pytest

from gp.maps import (
    DATA_LAYERS,
    MAX_CELLS,
    MapGrid,
    decode_layer,
    encode_layer,
    ice_maps,
    map_payload,
    palettes,
    potential_rgba,
    prior_probability,
    to_png,
    to_rgba,
    update_window,
)
from gp.observations import deeper_than, flat_floor_crater
from gp.planning import add_observations, fitted_prior
from gp.posterior import posterior

THRESHOLD = 3.0
SCHEMA = json.loads(
    (Path(__file__).resolve().parents[2] / "contracts" / "schemas" / "map.schema.json").read_text()
)
BOUNDS = {"west": 189.8, "south": 35.0, "east": 189.9, "north": 35.1}


def _decode_png(data: bytes) -> np.ndarray:
    """Lector mínimo de PNG RGBA de 8 bits sin filtros (lo que escribe `to_png`)."""
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    pos, idat, size = 8, b"", None
    while pos < len(data):
        (length,) = struct.unpack(">I", data[pos : pos + 4])
        tag, body = data[pos + 4 : pos + 8], data[pos + 8 : pos + 8 + length]
        (crc,) = struct.unpack(">I", data[pos + 8 + length : pos + 12 + length])
        assert crc == zlib.crc32(tag + body) & 0xFFFFFFFF
        if tag == b"IHDR":
            w, h, depth, color = struct.unpack(">IIBB", body[:10])
            assert (depth, color) == (8, 6)
            size = (h, w)
        elif tag == b"IDAT":
            idat += body
        pos += 12 + length
    h, w = size
    raw = np.frombuffer(zlib.decompress(idat), dtype=np.uint8).reshape(h, 1 + 4 * w)
    assert (raw[:, 0] == 0).all()
    return raw[:, 1:].reshape(h, w, 4)


def test_grid_shape_and_orientation():
    g = MapGrid(-100, 100, -50, 50, 10)
    assert g.shape == (10, 20)
    x, y = g.centers()
    assert x.shape == y.shape == (10, 20)
    assert x[0, 0] == pytest.approx(-95) and y[0, 0] == pytest.approx(45)  # fila 0 = norte
    assert y[-1, 0] < y[0, 0] and x[0, -1] > x[0, 0]
    assert MapGrid.around(300, -2200, 500, 25).shape == (40, 40)


def test_grid_rejects_bad_or_huge_requests():
    with pytest.raises(ValueError):
        MapGrid(0, 0, 0, 10, 1)
    with pytest.raises(ValueError):
        MapGrid(0, 10, 0, 10, 0)
    with pytest.raises(ValueError):
        MapGrid(0, float("nan"), 0, 10, 1)
    side = int(np.sqrt(MAX_CELLS)) + 10
    with pytest.raises(ValueError, match="Demasiadas celdas"):
        MapGrid(0, side, 0, side, 1)


def test_grid_from_contract():
    grid = {"extent_m": {"xmin": -3250, "xmax": 3310, "ymin": -6740, "ymax": 4890},
            "cell_size_m": 10}
    assert MapGrid.from_grid_json(grid).shape == (1163, 656)
    assert MapGrid.from_grid_json(grid, cell_m=20).shape == (582, 328)


def test_prior_only_map_is_flat_and_fully_uncertain():
    prior = fitted_prior()
    maps = ice_maps(posterior(prior, []), MapGrid(0, 500, 0, 500, 50), THRESHOLD)
    p0 = prior_probability(prior, THRESHOLD)
    assert maps.prior_probability == pytest.approx(p0)
    assert np.allclose(maps.probability, p0)
    assert np.allclose(maps.change, 0)
    assert np.allclose(maps.uncertainty, 1.0)


def test_data_lowers_uncertainty_and_moves_probability_only_nearby():
    prior = fitted_prior()
    grid = MapGrid(-1000, 1000, -1000, 1000, 20)
    shallow = ice_maps(posterior(prior, [flat_floor_crater(0.0, 0.0, 0.5)]), grid, THRESHOLD)
    x, y = grid.centers()
    near, far = np.hypot(x, y) < 30, np.hypot(x, y) > 400
    assert shallow.change[near].min() > 0.1
    assert shallow.uncertainty[near].max() < 0.75
    assert shallow.uncertainty[near].max() < shallow.uncertainty[np.hypot(x, y) < 150].max()
    assert shallow.uncertainty[far].min() > 0.999  # lejos del dato vuelve al prior
    assert np.abs(shallow.change[far]).max() < 1e-3
    deep = ice_maps(posterior(prior, [deeper_than(0.0, 0.0, 6.0, "non_flat_crater")]), grid,
                    THRESHOLD)
    assert deep.change[near].max() < -0.05
    assert deep.uncertainty[near].max() < 1.0


def test_update_window_matches_full_recompute():
    prior = fitted_prior()
    post = posterior(prior, [flat_floor_crater(-300.0, 200.0, 0.8)])
    grid = MapGrid(-800, 800, -800, 800, 20)
    base = ice_maps(post, grid, THRESHOLD)
    post2 = add_observations(post, [flat_floor_crater(250.0, -150.0, 1.0)])
    updated = update_window(base, post2, [(250.0, -150.0)])
    full = ice_maps(post2, grid, THRESHOLD)
    for kind in (*DATA_LAYERS, "change"):
        assert np.abs(updated.layer(kind) - full.layer(kind)).max() < 1e-4
    assert update_window(base, post2, []) is base
    assert np.abs(updated.probability - base.probability).max() > 0.1


def test_encoding_roundtrip_and_nodata():
    values = np.array([[0.0, 0.25, 1.0], [np.nan, 1.7, -0.2]])
    layer = encode_layer(values, 0.0, 1.0)
    out = decode_layer(layer, values.shape)
    assert np.isnan(out[1, 0])
    assert np.allclose(out[0], values[0], atol=0.5 / 254)
    assert out[1, 1] == pytest.approx(1.0) and out[1, 2] == pytest.approx(0.0)  # se recorta


def test_exact_measurement_means_zero_uncertainty_there():
    from gp.observations import measured_depth

    prior = fitted_prior()
    post = posterior(prior, [measured_depth(0.0, 0.0, 2.0, 1e-4, "core_drill")])
    maps = ice_maps(post, MapGrid(-5, 5, -5, 5, 10), THRESHOLD)
    assert maps.uncertainty[0, 0] < 0.02


def test_payload_follows_the_contract():
    prior = fitted_prior()
    grid = MapGrid(-200, 200, -100, 100, 25)
    maps = ice_maps(posterior(prior, [flat_floor_crater(0.0, 0.0, 0.7)]), grid, THRESHOLD)
    payload = map_payload(maps, site_id="s1094b", bounds_lonlat=BOUNDS, craters_in_model=1)
    jsonschema.validate(payload, SCHEMA)
    assert (payload["width"], payload["height"]) == (16, 8)
    assert payload["is_prior_only"] is False
    for kind in DATA_LAYERS:
        back = decode_layer(payload["layers"][kind], grid.shape)
        assert np.abs(back - maps.layer(kind)).max() <= 0.5 / 254 + 1e-9
    prior_only = map_payload(ice_maps(posterior(prior, []), grid, THRESHOLD), site_id="s",
                             bounds_lonlat=BOUNDS)
    assert prior_only["is_prior_only"] is True


def test_palettes_are_ordered_blue_scales():
    pal = palettes(THRESHOLD)
    for kind in ("probability", "uncertainty", "change"):
        values = [s["value"] for s in pal[kind]["stops"]]
        assert values == sorted(values)
        assert values[0] == pal[kind]["min"] and values[-1] == pal[kind]["max"]
    assert "3 m" in pal["probability"]["label"]
    assert pal["potential"]["base"] == "probability"
    assert pal["potential"]["suppress_by"] == "uncertainty"


def test_reference_colors():
    rgba = to_rgba(np.array([[0.0, 1.0, 2.0, np.nan]]), "probability")
    assert tuple(rgba[0, 0, :3]) == (0xF4, 0xF8, 0xFD)
    assert tuple(rgba[0, 1, :3]) == (0x0D, 0x36, 0x6B)
    assert (rgba[0, 2] == rgba[0, 1]).all()
    assert rgba[0, 3, 3] == 0 and rgba[0, 0, 3] == 255
    assert tuple(to_rgba(np.array([[0.0]]), "change")[0, 0, :3]) == (0xE6, 0xE6, 0xE6)
    with pytest.raises(ValueError):
        to_rgba(np.zeros((1, 1)), "value")


def test_potential_fades_to_fog_where_unknown():
    p = np.array([[0.9, 0.9, 0.1]])
    u = np.array([[0.0, 1.0, 1.0]])
    rgba = potential_rgba(p, u)
    assert (rgba[0, 0, :3] == to_rgba(p[:, :1], "probability")[0, 0, :3]).all()
    assert tuple(rgba[0, 1, :3]) == (0xD4, 0xD8, 0xDD)  # sin datos: gris, sea cual sea P
    assert (rgba[0, 1] == rgba[0, 2]).all()


def test_png_roundtrip():
    rgba = to_rgba(np.linspace(0, 1, 12).reshape(3, 4), "uncertainty")
    assert (_decode_png(to_png(rgba)) == rgba).all()
    with pytest.raises(ValueError):
        to_png(np.zeros((2, 2)))
