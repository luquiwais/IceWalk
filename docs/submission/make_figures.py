"""Figuras de la página del proyecto: evidencia y concepto de operaciones.

Los números son los de `apps/web/lib/evidence.ts` (validación del 12/11, `docs/EXPERIMENTS.md`):
no se inventa nada acá. Salida en `docs/submission/img/` (PNG, para pegar en la plataforma).

Uso (desde la raíz, con matplotlib): python docs/submission/make_figures.py
"""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch  # noqa: E402

OUT = Path(__file__).resolve().parent / "img"
INK, MUTED, BLUE, DARK, GRID = "#14202e", "#5b6878", "#2f6fb7", "#0d366b", "#d9e1ea"

# Calibración fuera de muestra (gp/regional_validation.py), Phoenix (Mellon et al. 2009).
BINS = [(0.003, 0.003, 306), (0.093, 0.111, 27), (0.339, 0.333, 18), (0.643, 0.846, 13), (0.96, 0.842, 19)]
CI90 = [(0.0, 0.01), (0.05, 0.25), (0.18, 0.53), (0.63, 0.95), (0.66, 0.94)]


def evidence() -> None:
    fig = plt.figure(figsize=(12, 6.2), dpi=200)
    fig.patch.set_facecolor("white")
    fig.suptitle("Why trust the numbers, and where not to", x=0.04, ha="left", fontsize=17,
                 fontweight="bold", color=INK)

    ax = fig.add_axes([0.06, 0.14, 0.38, 0.68])
    ax.plot([0, 1], [0, 1], color=GRID, lw=2, zorder=1)
    for (pred, obs, n), (lo, hi) in zip(BINS, CI90, strict=True):
        ax.plot([pred, pred], [lo, hi], color=BLUE, lw=2, alpha=0.5, zorder=2)
        ax.scatter([pred], [obs], s=30 + n * 1.2, color=BLUE, edgecolor="white", lw=1.5, zorder=3)
        ax.annotate(f"n={n}", (pred, obs), xytext=(8, -4), textcoords="offset points", fontsize=8,
                    color=MUTED)
    ax.set_xlim(-0.03, 1.03)
    ax.set_ylim(-0.03, 1.03)
    ax.set_xlabel("Predicted probability of excavating ice", color=INK)
    ax.set_ylabel("Observed fraction (90 % interval)", color=INK)
    ax.set_title("Calibrated on 383 fresh impacts the model never saw", loc="left", fontsize=11.5,
                 color=INK)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    ax.text(0.02, 0.93, "36.2 expected vs 37 observed\nBrier 0.033 (constant rate: 0.087)",
            transform=ax.transAxes, fontsize=10, color=DARK, va="top")

    bx = fig.add_axes([0.53, 0.52, 0.42, 0.30])
    bx.set_title("Ground truth: where a mission dug", loc="left", fontsize=11.5, color=INK)
    bx.barh([1], [22 - 2], left=2, height=0.38, color="#cde2fb")
    bx.plot([7], [1], "|", ms=26, mew=3, color=DARK)
    bx.plot([4.6], [1], "D", ms=10, color="#c2410c")
    bx.text(7, 1.36, "model median 7 cm", ha="center", fontsize=9, color=DARK)
    bx.text(4.6, 0.52, "Phoenix measured 4.6 cm", ha="center", fontsize=9, color="#c2410c")
    bx.text(12, 0.82, "model 90 % range: 2-22 cm", fontsize=9, color=MUTED)
    bx.set_xlim(0, 25)
    bx.set_ylim(0.3, 1.7)
    bx.set_yticks([])
    bx.set_xlabel("Depth to ice (cm), Phoenix landing site, 68°N", color=INK)
    for s in ("top", "right", "left"):
        bx.spines[s].set_visible(False)

    fig.text(0.53, 0.36, "What does not work, stated", fontsize=11.5, color=INK, fontweight="bold")
    lines = [
        "Neighbouring craters do not predict ice at site scale (AUC 0.52),",
        "so the map shows uncertainty instead of promising where the ice is.",
        "Latitude-only prior: conservative in Arcadia, extrapolated south of 39.1°N.",
        "Radar-first saves 2.9x EVAs with 50 soundings per EVA; 2.1x with 20.",
    ]
    for i, line in enumerate(lines):
        fig.text(0.53, 0.30 - i * 0.05, line, fontsize=10, color=MUTED)
    fig.text(0.04, 0.03, "IceWalk · Daubar et al. 2022 (CC BY 4.0) · Mellon et al. 2009 · "
             "code: packages/model/gp/regional_validation.py", fontsize=8, color=MUTED)
    fig.savefig(OUT / "evidence.png", facecolor="white")
    plt.close(fig)


def conops() -> None:
    fig = plt.figure(figsize=(12, 4.6), dpi=200)
    fig.patch.set_facecolor("white")
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 4.6)
    ax.axis("off")
    ax.text(0.4, 4.15, "Concept of operations: from precursor radar to crew decisions",
            fontsize=16, fontweight="bold", color=INK)
    boxes = [
        ("SkyFall radar\nsoundings", "NASA helicopters, 0.5-3 m\nice radar (launch 2028)"),
        ("IceWalk\nsite card", "P(ice within reach) per tool\nGO / CONDITIONAL / NO_GO"),
        ("Two-person EVA\nwithin NASA limits", "20° slope · 1.8 km walk-back\nDONKI · Hope dust · comms"),
        ("Measure and\nre-plan on site", "radar or drill result updates\nthe ice map and the route"),
    ]
    w, h, y = 2.45, 1.55, 1.75
    xs = [0.4 + i * 2.95 for i in range(4)]
    for i, (x, (title, sub)) in enumerate(zip(xs, boxes, strict=True)):
        ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.18",
                                    fc="#eef4fb" if i else "#e7eef7", ec=BLUE, lw=1.6))
        ax.text(x + w / 2, y + h - 0.42, title, ha="center", va="center", fontsize=12.5,
                fontweight="bold", color=DARK)
        ax.text(x + w / 2, y + 0.42, sub, ha="center", va="center", fontsize=9, color=MUTED)
        if i < 3:
            ax.add_patch(FancyArrowPatch((x + w + 0.05, y + h / 2), (xs[i + 1] - 0.05, y + h / 2),
                                         arrowstyle="-|>", mutation_scale=18, color=BLUE, lw=1.8))
    ax.add_patch(FancyArrowPatch((xs[3] + w / 2, y - 0.05), (xs[2] + w / 2, y - 0.05),
                                 connectionstyle="arc3,rad=-0.35", arrowstyle="-|>",
                                 mutation_scale=16, color=DARK, lw=1.4))
    ax.text((xs[2] + xs[3]) / 2 + w / 2, 0.85, "every measurement: no wait of up to 22 min for Earth",
            ha="center", fontsize=9.5, color=DARK)
    ax.text(0.4, 0.25, "Sources: NASA SkyFall mission package (2026) · ICES-2026-127 (NASA JSC) · "
            "ICES-2025-129 · NASA CCMC DONKI · Emirates Mars Mission EMIRS (MBRSC) · HiRISE "
            "(NASA/JPL-Caltech/UArizona)", fontsize=8, color=MUTED)
    fig.savefig(OUT / "conops.png", facecolor="white")
    plt.close(fig)


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    evidence()
    conops()
    print("ok", sorted(p.name for p in OUT.glob("*.png")))
