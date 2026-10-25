"""4. Playstyle clusters for player pages.

K-means on each account's last 50 Normal games, on style features only (win rate is left out: it is how well someone
plays, not how). k is the value from 4 to 8 with the best silhouette among those that are stable (mean adjusted Rand
index of at least 0.8 between runs on 80% resamples). Each cluster gets a name from its strongest traits, which can be
renamed in LABEL_FOR; the site shows the nearest centroid's label via nearestCentroid() in ml/web/score.ts.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import adjusted_rand_score, silhouette_score
from sklearn.preprocessing import StandardScaler

from .. import export as ex
from .. import features as fe

STYLE_COLS = [c for c in fe.PROFILE_COLS if c != "win_rate"]

# Trait (feature, direction) -> words for the label. The strongest one or two traits name the cluster.
LABEL_FOR = {
    ("souls_pm", 1): "Soul farmer",
    ("last_hits_pm", 1): "Lane farmer",
    ("denies_pm", 1): "Lane bully",
    ("kills_pm", 1): "Hunter",
    ("assists_pm", 1): "Support",
    ("deaths_pm", 1): "Brawler",
    ("deaths_pm", -1): "Survivor",
    ("kda", 1): "Clean fighter",
    ("hero_entropy", 1): "Flex player",
    ("top_hero_share", 1): "One-trick",
    ("souls_pm", -1): "Low-econ",
    ("kills_pm", -1): "Passive",
}


def name_clusters(centroids_z: pd.DataFrame) -> list[str]:
    """Readable names from centroid z-scores, unique across clusters."""
    names = []
    for _, c in centroids_z.iterrows():
        traits = sorted(((abs(v), (f, int(np.sign(v)))) for f, v in c.items() if (f, int(np.sign(v))) in LABEL_FOR),
                        reverse=True)
        if not traits or traits[0][0] < 0.35:
            label = "All-rounder"
        else:
            label = LABEL_FOR[traits[0][1]]
            if label in names and len(traits) > 1:
                label = f"{label}, {LABEL_FOR[traits[1][1]].lower()}"
        n, base = 2, label
        while label in names:
            label, n = f"{base} {n}", n + 1
        names.append(label)
    return names


def stability(Xs: np.ndarray, k: int, runs: int = 5, seed: int = 0) -> float:
    rng = np.random.default_rng(seed)
    ref = KMeans(k, n_init=10, random_state=seed).fit(Xs)
    scores = []
    for r in range(runs):
        idx = rng.choice(len(Xs), int(0.8 * len(Xs)), replace=False)
        km = KMeans(k, n_init=10, random_state=seed + r + 1).fit(Xs[idx])
        scores.append(adjusted_rand_score(ref.predict(Xs[idx]), km.labels_))
    return float(np.mean(scores))


def train(tables: dict, out_dir, histories: pd.DataFrame | None = None, ks=range(4, 9)) -> dict:
    hist = histories if histories is not None else tables["histories"]
    prof = fe.player_profiles(hist, last_n=50, min_matches=15)
    # Drop broken profiles before fitting (the first real pull had one account at 54 sd on souls per minute, which
    # took a whole cluster for itself). Such players still get the nearest centroid on the site.
    z = StandardScaler().fit_transform(prof[STYLE_COLS])
    outliers = int((np.abs(z) > 6).any(axis=1).sum())
    prof = prof[~(np.abs(z) > 6).any(axis=1)]
    scaler = StandardScaler().fit(prof[STYLE_COLS])
    Xs = scaler.transform(prof[STYLE_COLS])
    sample = np.random.default_rng(0).choice(len(Xs), min(len(Xs), 5000), replace=False)
    table = []
    for k in ks:
        if k >= len(Xs):
            break
        lab = KMeans(k, n_init=10, random_state=0).fit_predict(Xs)
        table.append({"k": k, "silhouette": float(silhouette_score(Xs[sample], lab[sample])), "stability": stability(Xs, k)})
    choice = pd.DataFrame(table).set_index("k")
    stable = choice[choice["stability"] >= 0.8]
    k = int((stable if len(stable) else choice)["silhouette"].idxmax())
    km = KMeans(k, n_init=20, random_state=0).fit(Xs)
    cz = pd.DataFrame(km.cluster_centers_, columns=STYLE_COLS)
    labels = name_clusters(cz)
    sizes = np.bincount(km.labels_, minlength=k)
    path = ex.export_centroids(
        km, STYLE_COLS, labels, f"{out_dir}/playstyle.json", scaler=scaler, name="playstyle",
        metrics={"k": k, "silhouette": float(choice.loc[k, "silhouette"]), "stability": float(choice.loc[k, "stability"]),
                 "players": int(len(prof))},
        notes="profile of the last 50 Normal games (min 15); features per minute of game time",
    )
    centres = cz.round(2).assign(label=labels, players=sizes).set_index("label")
    return {"name": "playstyle", "export": str(path), "k": k, "k_search": choice, "centroids_z": centres,
            "players": int(len(prof)), "outliers_dropped": outliers}
