# ¿Por qué Sizemore 2026 dice 97 cm y nosotros 2.35 m? (cuestión 34)

Respuesta preparada para el jurado. Fecha: 2026-11-11.

## En una línea (para el pitch, en inglés)

> "97 cm is the mean depth where craters actually hit the ice table: 48 of 349. In the other 301 the floor isn't flat, so the ice is deeper than they dug. Counting both, the site median is about 2.4 m. Same data, different question."

## Qué dice cada uno

| | Valor | Qué mide | Fuente |
| --- | --- | --- | --- |
| Sizemore et al. 2026 | 97 cm | Profundidad local a la tabla de hielo, de los cráteres secundarios de fondo plano de Dundas et al. 2023, "with substantial patchiness and local variability". Sin incertidumbre numérica | PSJ 7:175, tabla 4 (fila "Dundas+ 2023 (D = 150 m crater)", 35.43°N, 189.82°E) y §4.1.3. CC BY 4.0. No usa el nombre S1094b: se identificó el sitio por coordenadas y tamaño |
| Dundas et al. 2023 | 0.97 ± 0.25 m | Media de los cráteres **con fondo plano** | GRL, doi:10.1029/2022GL100747 |
| IceWalk | Mediana 2.35 m | Profundidad típica del **sitio entero**, con los 349 cráteres | `EXPERIMENTS.md`, 2026-11-05 |

**Verificado con la tabla de Dundas 2023** (cálculo propio, 2026-11-11, `data/processed/s1094b/craters_dundas2023.csv`): 48 cráteres con fondo plano, media 0.969 m, desvío 0.254 m, mediana 0.94 m. Reproduce el 0.97 ± 0.25 publicado. Los otros 301 no tienen fondo plano; su cota `d > 0.2 × D` va de 1.0 a 2.7 m (mediana 1.2 m).

## Por qué no se contradicen

1. **Un fondo plano solo aparece si el cráter llegó a la capa resistente.** Los 48 son, por construcción, los lugares donde la capa está poco profunda para su tamaño. Promediar solo esos mide "qué tan profundo está el hielo donde se lo ve", no "qué tan profundo está en el sitio".
2. **Los 301 sin fondo plano también son datos:** dicen que ahí la capa está más abajo de lo que excavó el cráter. Son el 86 % del catálogo. El modelo los trata como cotas inferiores (datos censurados), igual que una perforación que no llegó a la napa.
3. **Con los dos tipos juntos,** la mediana del sitio sale 2.35 m y `P(d ≤ 1 m)` ≈ 0.06. Control independiente: el 8 % de los cráteres tiene fondo plano con `d ≤ 1 m`, cerca del 6 % que predice el ajuste.
4. **Sizemore no contradice esto:** dice que ningún modelo térmico predice hielo cerca de la superficie en el sitio ("none of the thermal models predict ice", §4.1.3) y que eso es coherente con una tabla profunda y en parches.

## Si preguntan por la regla `0.2 × D`

Dundas 2023 presenta dos cotas para cráteres sin fondo plano: 0.1 × D y 0.2 × D. Con 0.1 × D la mediana daría 1.07 m, cerca de los 97 cm, pero esa regla es incoherente con los datos: el 75 % de los cráteres con fondo plano quedaría con una profundidad mayor que la cota. Con 0.2 × D, el 0 % (`EXPERIMENTS.md`, 2026-11-05; `plans/gp.md`, decisión 10).

## Límites que hay que decir

- El ajuste supone una lognormal para todo el sitio: los valores son órdenes de magnitud, no precisión de centímetros.
- Que la capa resistente sea hielo es la interpretación más probable de Dundas et al. 2023, no una medición. Lo declaramos.
- No se leyó el texto completo de Dundas 2023 (Wiley bloquea la lectura automática); el 0.97 ± 0.25 se reprodujo con su tabla.

## Fuentes

- Sizemore et al. 2026, *Planetary Science Journal* 7:175, [doi:10.3847/PSJ/ae7b38](https://doi.org/10.3847/PSJ/ae7b38) (CC BY 4.0).
- Dundas et al. 2023, *Geophysical Research Letters*, [doi:10.1029/2022GL100747](https://doi.org/10.1029/2022GL100747), tabla S1 del suplemento.
