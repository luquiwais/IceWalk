import math

import numpy as np
import pytest
import rasterio
from rasterio.crs import CRS
from rasterio.transform import Affine

from gp.covariate_test import (
    Sites,
    block_folds,
    compare,
    cross_validated,
    fit,
    sites_from_catalog,
    standardize,
)
from gp.covariates import principal_components, ring_terrain, sample_raster
from gp.craters import (
    CraterCatalog,
    apply_shift,
    fit_linear_shift,
    load_catalog,
    resistant_depth,
    to_observations,
)
from vision.grid import load_grid

GRID = load_grid()


def catalog(x, y, d, f):
    return CraterCatalog(*(np.asarray(v, dtype=float) for v in (x, y, d, f)))


# Cráteres


def test_profundidad_con_la_formula_del_paper():
    expected = (0.86 * 10 - 5.5) / 2 * math.tan(math.radians(33))
    assert resistant_depth(np.array([10.0]), np.array([5.5]))[0] == pytest.approx(expected)


def test_un_pixel_en_sentidos_opuestos_cambia_015_m():
    one = resistant_depth(np.array([10.0]), np.array([5.5]))[0]
    moved = resistant_depth(np.array([10.25]), np.array([5.25]))[0]
    assert moved - one == pytest.approx(0.151, abs=0.001)


def test_observaciones_segun_fondo_plano():
    obs = to_observations(catalog([0, 10], [0, 0], [10, 8], [5.5, -1]))
    assert [o.kind for o in obs] == ["depth", "deeper_than"]
    assert obs[1].depth_m == pytest.approx(1.6)


@pytest.mark.parametrize(
    "d, f", [([0.0], [-1]), ([5.0], [5.0]), ([math.nan], [-1])], ids=["d0", "fondo_igual", "nan"]
)
def test_catalogo_invalido_se_rechaza(d, f):
    with pytest.raises(ValueError):
        catalog([0.0], [0.0], d, f)


def test_lee_el_catalogo_en_grilla(tmp_path):
    path = tmp_path / "c.csv"
    path.write_text("x_m,y_m,d_crater_m,d_resistant_m\n1,2,6,-1\n3,4,9,4.5\n", encoding="utf-8")
    loaded = load_catalog(path)
    assert len(loaded) == 2
    assert loaded.flat.tolist() == [False, True]


def test_corrimiento_lineal_se_recupera():
    rng = np.random.default_rng(0)
    x, y = rng.uniform(-2000, 2000, 12), rng.uniform(-6000, 4000, 12)
    sx, sy = -46 + 0.001 * x, 121 - 0.003 * y
    coef_x, coef_y, rms = fit_linear_shift(x, y, sx, sy)
    fx, fy = apply_shift(coef_x, coef_y, np.array([100.0]), np.array([200.0]))
    assert rms < 1e-9
    assert fx[0] == pytest.approx(100 - 46 + 0.1)
    assert fy[0] == pytest.approx(200 + 121 - 0.6)


# Terreno


def test_anillo_en_plano_inclinado_al_norte():
    size, res = 61, 1.0
    rows, cols = np.mgrid[0:size, 0:size]
    elevation = 0.1 * rows * res  # sube hacia el sur: el terreno mira al polo
    slope, pole, rough = ring_terrain(elevation, res, 10.0, 25.0)
    assert slope == pytest.approx(math.degrees(math.atan(0.1)), abs=0.01)
    assert pole == pytest.approx(0.1, abs=1e-6)
    assert rough == pytest.approx(0.0, abs=1e-9)


def test_anillo_ignora_el_centro():
    size = 61
    elevation = np.zeros((size, size))
    elevation[25:36, 25:36] = -5.0  # un cráter en el centro, dentro del radio interno
    slope, pole, rough = ring_terrain(elevation, 1.0, 10.0, 25.0)
    assert slope == pytest.approx(0.0, abs=1e-9)
    assert rough == pytest.approx(0.0, abs=1e-9)


def test_muestreo_de_raster(tmp_path):
    path = tmp_path / "r.tif"
    data = np.arange(100, dtype="float32").reshape(10, 10)
    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        height=10,
        width=10,
        count=1,
        dtype="float32",
        crs=CRS.from_proj4(GRID.proj4),
        transform=Affine(10, 0, 0, 0, -10, 100),
        nodata=-9999,
    ) as dst:
        dst.write(data, 1)
    values = sample_raster(path, GRID, np.array([5.0, 95.0, 5000.0]), np.array([95.0, 5.0, 5000.0]))
    assert values[0] == 0 and values[1] == 99
    assert np.isnan(values[2])


def test_componentes_principales_respetan_filas_faltantes():
    rng = np.random.default_rng(0)
    matrix = rng.normal(size=(20, 6))
    matrix[3] = np.nan
    pcs = principal_components(matrix, 2)
    assert pcs.shape == (20, 2)
    assert np.isnan(pcs[3]).all()
    assert np.isfinite(np.delete(pcs, 3, axis=0)).all()


# Prueba de variables


def synthetic(n=300, effect=0.4, seed=0):
    """Profundidad que depende de una variable útil, observada con la regla de los cráteres."""
    rng = np.random.default_rng(seed)
    x, y = rng.uniform(0, 10000, n), rng.uniform(0, 10000, n)
    useful = rng.normal(size=n)
    useless = rng.normal(size=n)
    log_d = 0.8 + effect * useful + rng.normal(0, 0.3, n)
    diameter = rng.uniform(5, 15, n)
    bound = 0.2 * diameter
    flat = np.exp(log_d) < bound
    targets = np.where(flat, log_d + rng.normal(0, 0.1, n), np.log(bound))
    sites = Sites(targets, np.where(flat, 0.1, 0.1), np.where(flat, 0.0, 1.0))
    return x, y, useful, useless, sites


def test_pliegues_cubren_todo_y_son_reproducibles():
    rng = np.random.default_rng(0)
    x, y = rng.uniform(0, 8000, 200), rng.uniform(0, 8000, 200)
    folds = block_folds(x, y)
    assert set(folds) == set(range(5))
    assert (folds == block_folds(x, y)).all()


def test_ajuste_recupera_el_efecto():
    _, _, useful, _, sites = synthetic(n=2000)
    beta, log_var = fit(standardize([useful], np.ones(useful.size, bool)), sites)
    assert beta[1] == pytest.approx(0.4, abs=0.08)
    assert math.exp(log_var) == pytest.approx(0.09, rel=0.4)


def test_detecta_variable_util_y_no_la_inutil():
    x, y, useful, useless, sites = synthetic()
    folds = block_folds(x, y)
    result = compare({"util": useful, "inutil": useless}, sites, folds, n_permutations=30)
    assert result["util"]["gain_per_crater"] > 0.05
    assert result["util"]["p_permutation"] < 0.1
    assert result["inutil"]["gain_per_crater"] < result["util"]["gain_per_crater"]
    assert result["inutil"]["p_permutation"] > 0.05


def test_validacion_cruzada_sin_variables_es_finita():
    x, y, _, _, sites = synthetic()
    heldout = cross_validated([], sites, block_folds(x, y))
    assert np.isfinite(heldout).all()


def test_sitios_desde_catalogo():
    sites = sites_from_catalog(catalog([0, 1], [0, 0], [10, 8], [5.5, -1]))
    assert sites.signs.tolist() == [0.0, 1.0]
    assert sites.targets[1] == pytest.approx(math.log(1.6))
