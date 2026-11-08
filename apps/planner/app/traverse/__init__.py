"""Transitabilidad: capas del terreno, exclusión, costo de caminar y rutas.

Sigue el método del modelo de traverse de NASA (ICES-2025-129): capa de exclusión (pendiente
> 20° y celdas sin pasillo), costo según pendiente y velocidad, y búsqueda de la ruta de menor
costo sobre el DTM. Los valores y su fuente están en `config/traverse.yaml`.
"""
