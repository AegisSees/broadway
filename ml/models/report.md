# Broadway ML report

Trained 2026-10-25 22:08 on 50387 matches and 2996 player histories.

## data

- **matches:** 50387 (8404 ranked with a badge), 2026-10-11 to 2026-10-25
- **draft and builds window:** from 2026-10-15 03:12 UTC (38393 matches)
- **top 10% of ranked players:** badge 92 (Phantom 2) or higher; 1128 matches average that high (850 in the draft/builds window), from 66433 ranked accounts seen
- **top 1% of ranked players:** badge 112 (Eternus 2) or higher; 123 matches average that high (89 in the draft/builds window), from 66433 ranked accounts seen
- **ranked matches by bracket:** below Ritualist: 3925, Ritualist to Archon: 2415, Oracle: 774, Phantom+: 1290

## draft

- **export:** models/draft_win.json
- **variant:** heroes+pairs x0.4
- **C:** 0.0030
- **variants_val_log_loss:** heroes: 0.6720, heroes+pairs x0.1: 0.6720, heroes+pairs x0.2: 0.6718, heroes+pairs x0.4: 0.6715
- **pair_scale:** 0.4000
- **calibration:** platt_a: 0.9479, platt_b: 0.0113, val_log_loss_before: 0.6715, val_log_loss_after: 0.6714, applied: False
- **side_advantage_logit:** -0.0132
**comparison**

| model | n | auc | log_loss | brier | accuracy | ece |
|---|---|---|---|---|---|---|
| base rate | 7681 | 0.5000 | 0.6931 | 0.2500 | 0.5037 | 0.0037 |
| hero win rates | 7681 | 0.6344 | 0.6646 | 0.2361 | 0.5977 | 0.0071 |
| logistic (heroes+pairs x0.4) | 7681 | 0.6367 | 0.6643 | 0.2359 | 0.5948 | 0.0100 |

**reliability**

|  | lo | hi | n | predicted | observed |
|---|---|---|---|---|---|
| 0 | 0.1000 | 0.2000 | 7 | 0.1882 | 0.0000 |
| 1 | 0.2000 | 0.3000 | 233 | 0.2697 | 0.2661 |
| 2 | 0.3000 | 0.4000 | 1282 | 0.3595 | 0.3409 |
| 3 | 0.4000 | 0.5000 | 2477 | 0.4531 | 0.4530 |
| 4 | 0.5000 | 0.6000 | 2441 | 0.5461 | 0.5490 |
| 5 | 0.6000 | 0.7000 | 1067 | 0.6394 | 0.6739 |
| 6 | 0.7000 | 0.8000 | 172 | 0.7263 | 0.7616 |
| 7 | 0.8000 | 0.9000 | 2 | 0.8180 | 0.5000 |

**by_badge_bracket**

| bracket / model | n | auc | log_loss | ece |
|---|---|---|---|---|
| unranked (no badge) / hero win rates | 6244 | 0.6427 | 0.6613 | 0.0093 |
| below Ritualist / hero win rates | 630 | 0.6224 | 0.6695 | 0.0431 |
| Ritualist to Archon / hero win rates | 404 | 0.5450 | 0.7000 | 0.0561 |
| Oracle / hero win rates | 156 | 0.7010 | 0.6403 | 0.0848 |
| Phantom+ / hero win rates | 247 | 0.5628 | 0.6911 | 0.0710 |
| unranked (no badge) / logistic (heroes+pairs x0.4) | 6244 | 0.6440 | 0.6616 | 0.0171 |
| below Ritualist / logistic (heroes+pairs x0.4) | 630 | 0.6271 | 0.6672 | 0.0424 |
| Ritualist to Archon / logistic (heroes+pairs x0.4) | 404 | 0.5594 | 0.6922 | 0.0499 |
| Oracle / logistic (heroes+pairs x0.4) | 156 | 0.6963 | 0.6475 | 0.1027 |
| Phantom+ / logistic (heroes+pairs x0.4) | 247 | 0.5689 | 0.6882 | 0.0458 |
| unranked (no badge) / badge-weighted fit | 6244 | 0.6422 | 0.6623 | 0.0175 |
| below Ritualist / badge-weighted fit | 630 | 0.6230 | 0.6686 | 0.0444 |
| Ritualist to Archon / badge-weighted fit | 404 | 0.5593 | 0.6921 | 0.0526 |
| Oracle / badge-weighted fit | 156 | 0.6950 | 0.6480 | 0.0798 |
| Phantom+ / badge-weighted fit | 247 | 0.5708 | 0.6878 | 0.0475 |

- **strongest_heroes:** h_76: 0.2177, h_66: 0.2129, h_84: 0.2030, h_67: 0.1517, h_2: 0.1309
- **weakest_heroes:** h_63: -0.1596, h_14: -0.1479, h_50: -0.1393, h_60: -0.1259, h_10: -0.1243
- **n_train:** 30712
- **n_test:** 7681
- **beats_baselines:** True
- **seconds:** 24.9000

## live

- **export:** models/live_win.json
- **C:** 0.1000
- **calibration:** platt_a: 0.9707, platt_b: -0.0135, val_log_loss_before: 0.5963, val_log_loss_after: 0.5962, applied: False
**comparison**

| model | n | auc | log_loss | brier | accuracy | ece |
|---|---|---|---|---|---|---|
| base rate | 59751 | 0.5000 | 0.6931 | 0.2500 | 0.5028 | 0.0020 |
| net worth share | 59751 | 0.7303 | 0.6055 | 0.2096 | 0.6665 | 0.0076 |
| logistic | 59751 | 0.7369 | 0.5950 | 0.2063 | 0.6666 | 0.0081 |

**auc_by_minute**

| minute | net worth share | logistic |
|---|---|---|
| 3.0 | 0.6136 | 0.6135 |
| 6.0 | 0.6616 | 0.6616 |
| 9.0 | 0.7176 | 0.7170 |
| 12.0 | 0.7414 | 0.7421 |
| 15.0 | 0.7691 | 0.7702 |
| 30.0 | 0.8803 | 0.8809 |
| 45.0 | 0.7587 | 0.7617 |
| 60.0 | 0.5714 | 0.5790 |

**reliability**

|  | lo | hi | n | predicted | observed |
|---|---|---|---|---|---|
| 0 | 0.0000 | 0.1000 | 2058 | 0.0526 | 0.0462 |
| 1 | 0.1000 | 0.2000 | 3523 | 0.1536 | 0.1607 |
| 2 | 0.2000 | 0.3000 | 5730 | 0.2544 | 0.2702 |
| 3 | 0.3000 | 0.4000 | 8418 | 0.3533 | 0.3596 |
| 4 | 0.4000 | 0.5000 | 11145 | 0.4513 | 0.4611 |
| 5 | 0.5000 | 0.6000 | 10775 | 0.5487 | 0.5542 |
| 6 | 0.6000 | 0.7000 | 7828 | 0.6468 | 0.6352 |
| 7 | 0.7000 | 0.8000 | 5216 | 0.7456 | 0.7494 |
| 8 | 0.8000 | 0.9000 | 3056 | 0.8459 | 0.8413 |
| 9 | 0.9000 | 1 | 2002 | 0.9473 | 0.9530 |

- **n_train_snapshots:** 238899
- **n_test_snapshots:** 59751
- **beats_baselines:** True
- **seconds:** 15.7000

## builds

- **export:** models/build_recommender.json
- **C:** 0.0100
- **items:** 133
- **events_train:** 919194
- **events_test:** 229876
**comparison**

| model | n | auc | log_loss | brier | accuracy | ece |
|---|---|---|---|---|---|---|
| base rate | 229876 | 0.5000 | 0.6925 | 0.2497 | 0.5179 | 0.0013 |
| context only | 229876 | 0.7920 | 0.5462 | 0.1856 | 0.7113 | 0.0121 |
| context + item | 229876 | 0.7922 | 0.5459 | 0.1855 | 0.7115 | 0.0118 |
| full | 229876 | 0.8023 | 0.5347 | 0.1810 | 0.7203 | 0.0081 |

**by_badge_bracket**

| bracket / model | n | auc | log_loss | ece |
|---|---|---|---|---|
| unranked (no badge) / context only | 177645 | 0.7922 | 0.5458 | 0.0116 |
| below Ritualist / context only | 23288 | 0.8005 | 0.5351 | 0.0170 |
| Ritualist to Archon / context only | 14362 | 0.7380 | 0.6046 | 0.0376 |
| Oracle / context only | 6071 | 0.8532 | 0.4880 | 0.0715 |
| Phantom+ / context only | 8510 | 0.8095 | 0.5289 | 0.0367 |
| unranked (no badge) / full | 177645 | 0.8055 | 0.5310 | 0.0115 |
| below Ritualist / full | 23288 | 0.7932 | 0.5444 | 0.0184 |
| Ritualist to Archon / full | 14362 | 0.7476 | 0.5957 | 0.0285 |
| Oracle / full | 6071 | 0.8689 | 0.4635 | 0.0556 |
| Phantom+ / full | 8510 | 0.8077 | 0.5327 | 0.0269 |
| unranked (no badge) / badge-weighted full | 177645 | 0.8043 | 0.5322 | 0.0112 |
| below Ritualist / badge-weighted full | 23288 | 0.7920 | 0.5453 | 0.0191 |
| Ritualist to Archon / badge-weighted full | 14362 | 0.7455 | 0.5973 | 0.0293 |
| Oracle / badge-weighted full | 6071 | 0.8644 | 0.4685 | 0.0545 |
| Phantom+ / badge-weighted full | 8510 | 0.8034 | 0.5363 | 0.0233 |

- **pairwise_full:** pairs: 42613, winner_item_ranked_higher: 0.5583
- **pairwise_item_only:** pairs: 42613, winner_item_ranked_higher: 0.5214
- **favoured_vs_enemy_spend:** weapon: ['Improved Spirit', 'Torment Pulse', 'Radiant Regeneration', 'Spirit Lifesteal', 'Superior Cooldown'], vitality: ['Healbane', 'Rapid Recharge', 'Spirit Snatch', 'Spirit Resilience', 'Intensifying Magazine'], spirit: ['Trophy Collector', 'Boundless Spirit', 'Spiritual Overflow', 'Greater Expansion', 'Spirit Burn']
- **item_terms_help:** True
- **val_note:** log loss gain of full over context only: 0.01157
- **seconds:** 704.1000

## top_items

- **export:** models/top_player_items.json
- **bracket:** top 10% of games (average badge >= 94), 859 matches
- **C:** 1.0000
- **export_prune:** 0.0500
- **items:** 154
- **events_train:** 134868
- **events_test:** 33844
**comparison**

| model | top1 | top3 | top5 | log_loss |
|---|---|---|---|---|
| hero + minute frequency | 0.2325 | 0.4719 | 0.5947 | 2.9701 |
| top-player model | 0.3523 | 0.5927 | 0.7038 | 2.4857 |
| top-player model (as exported) | 0.3486 | 0.5909 | 0.7015 | 2.4922 |

**export_size_sweep**

| prune | kb | top1 | top3 | log_loss |
|---|---|---|---|---|
| 0.02 | 701 | 0.3517 | 0.5929 | 2.4859 |
| 0.05 | 648 | 0.3486 | 0.5909 | 2.4922 |
| 0.1 | 569 | 0.3227 | 0.5713 | 2.5604 |
| 0.15 | 499 | 0.2668 | 0.5225 | 2.7644 |
| 0.2 | 442 | 0.2204 | 0.4778 | 2.9952 |
| 0.3 | 352 | 0.1917 | 0.4291 | 3.2359 |
| 0.4 | 282 | 0.1888 | 0.4193 | 3.2753 |
| 0.6 | 183 | 0.2035 | 0.4299 | 3.2312 |

- **most_bought_by_top_players:** ['Extra Spirit', 'Improved Spirit', 'Mystic Expansion', 'Extra Regen', 'Mystic Burst', 'Superior Cooldown', 'High-Velocity Rounds', 'Tankbuster', 'Sprint Boots', 'Compress Cooldown']
- **beats_baseline:** True
- **seconds:** 904.6000

## matchups

- **export:** models/matchups.json
- **bracket:** top 10% of games (average badge >= 94), 859 matches
- **pairs:** 1892
- **pairs_with_50_top_games:** 386
- **median_top_games_per_pair:** 25.0000
**strongest_matchups**

|  | delta_pts | top_games |
|---|---|---|
| (7, 78) | 10 | 118 |
| (31, 78) | 9.2500 | 107 |
| (12, 78) | 9.0900 | 51 |
| (17, 78) | 8.8000 | 53 |
| (78, 86) | 8.5100 | 129 |
| (85, 78) | 8.4300 | 93 |
| (78, 63) | 8.2500 | 96 |
| (86, 27) | 8.2400 | 77 |
| (6, 78) | 7.9900 | 51 |
| (65, 63) | 7.9000 | 68 |

- **seconds:** 28.3000

## playstyle

- **export:** models/playstyle.json
- **k:** 5
**k_search**

| k | silhouette | stability |
|---|---|---|
| 4 | 0.1471 | 0.7346 |
| 5 | 0.1263 | 0.8453 |
| 6 | 0.1195 | 0.6781 |
| 7 | 0.1240 | 0.6369 |
| 8 | 0.1196 | 0.6620 |

**centroids_z**

| label | kills_pm | deaths_pm | assists_pm | souls_pm | last_hits_pm | denies_pm | kda | hero_entropy | top_hero_share | players |
|---|---|---|---|---|---|---|---|---|---|---|
| Support | -0.2500 | -0.5600 | 1.0500 | -0.4700 | -0.6900 | -0.2300 | 0.7800 | -0.7000 | 0.6500 | 503 |
| One-trick | -0.1000 | 0.1900 | -0.7500 | 0.3700 | 0.5700 | 0.3100 | -0.5300 | -1.1100 | 1.1800 | 489 |
| Soul farmer | 0.8000 | -0.9000 | -0.1100 | 1.3600 | 0.9600 | 0.4800 | 1.1700 | -0.0300 | -0.0300 | 435 |
| Brawler | 0.0700 | 1.0900 | 0.1900 | -0.7500 | -0.7700 | -0.3400 | -0.7400 | 0.2600 | -0.3000 | 685 |
| Flex player | -0.2500 | -0.1900 | -0.2800 | -0.0300 | 0.2000 | -0.0100 | -0.1500 | 0.8400 | -0.7900 | 875 |

- **players:** 2987
- **outliers_dropped:** 9
- **seconds:** 14.3000

## rank

- **export:** models/rank_estimate.json
- **alpha:** 0.1000
**comparison**

| model | n | mae_levels | within_same_tier | within_one_tier |
|---|---|---|---|---|
| median | 19299 | 12.3144 | 0.1850 | 0.4933 |
| ridge | 19299 | 10.2421 | 0.1860 | 0.5212 |
| boosted trees (not exported) | 19299 | 10.0234 | 0.1998 | 0.5323 |

- **resid_sd_levels:** 12.7911
- **windows:** 98823
- **players:** 2925
- **beats_baseline:** True
- **seconds:** 116.5000
