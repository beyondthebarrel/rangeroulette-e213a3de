// Recommended High Hit Factors from USPSA's Classifier Committee report
// ("Recommended High Hit Factors and Classification System Updates", dated
// 2025-03-23) — the source that drove the 23-/24-series HHF recalibration.
// Covers every classifier active at that time; the 25-series (25-01 through
// 25-09) came later and has no entry here. USPSA reviews and reissues HHFs at
// least semi-annually, so treat these as a dated snapshot, not necessarily
// today's exact live numbers — re-derive from a newer Classifier Committee
// report when one is published.
export type Division =
  | "open"
  | "limited"
  | "limitedOptics"
  | "carryOptics"
  | "production"
  | "singleStack"
  | "revolver"
  | "pcc";

export const DIVISION_LABELS: Record<Division, string> = {
  open: "Open",
  limited: "Limited",
  limitedOptics: "Limited Optics",
  carryOptics: "Carry Optics",
  production: "Production",
  singleStack: "Single Stack",
  revolver: "Revolver",
  pcc: "PCC",
};

export const DIVISION_ORDER: Division[] = [
  "open",
  "limited",
  "limitedOptics",
  "carryOptics",
  "production",
  "singleStack",
  "revolver",
  "pcc",
];

export const CLASSIFIER_HHF: Record<string, Partial<Record<Division, number>>> = {
  "03-03": { open: 9.1147, limited: 7.7467, limitedOptics: 8.3794, carryOptics: 8.2443, production: 7.7559, singleStack: 7.5389, revolver: 6.0017, pcc: 8.7401 },
  "03-05": { open: 10.5139, limited: 9.2086, limitedOptics: 9.6841, carryOptics: 9.6596, production: 9.3031, singleStack: 9.1892, revolver: 7.3457, pcc: 11.16 },
  "03-07": { open: 7.3237, limited: 6.6684, limitedOptics: 6.6295, carryOptics: 6.6295, production: 6.5169, singleStack: 6.5169, revolver: 5.3806, pcc: 8.8285 },
  "03-08": { open: 10.4963, limited: 9.1769, limitedOptics: 9.5797, carryOptics: 9.5578, production: 8.9653, singleStack: 8.7761, revolver: 7.5661, pcc: 10.0547 },
  "03-09": { open: 11.7681, limited: 9.8835, limitedOptics: 10.6062, carryOptics: 10.3664, production: 9.4383, singleStack: 9.579, revolver: 8.4954, pcc: 12.0917 },
  "03-18": { open: 8.6641, limited: 7.2815, limitedOptics: 7.591, carryOptics: 7.591, production: 6.9113, singleStack: 7.1757, revolver: 5.8793, pcc: 10.6184 },
  "06-03": { open: 15.9747, limited: 14.7247, limitedOptics: 15.1357, carryOptics: 14.8293, production: 14.6823, singleStack: 14.0966, revolver: 10.675, pcc: 16.2169 },
  "06-04": { open: 15.0386, limited: 13.4818, limitedOptics: 14.2579, carryOptics: 13.918, production: 13.2922, singleStack: 13.0752, revolver: 11.3275, pcc: 16.5898 },
  "06-05": { open: 13.8309, limited: 11.9768, limitedOptics: 12.511, carryOptics: 12.3899, production: 11.8463, singleStack: 11.7664, revolver: 9.9516, pcc: 16.7873 },
  "06-10": { open: 9.9858, limited: 8.2886, limitedOptics: 9.8694, carryOptics: 9.5992, production: 8.484, singleStack: 8.0498, revolver: 8.0047, pcc: 12.04 },
  "08-02": { open: 7.778, limited: 6.4844, limitedOptics: 6.4628, carryOptics: 6.4628, production: 6.5373, singleStack: 6.6033, revolver: 5.183, pcc: 8.3512 },
  "08-03": { open: 11.4774, limited: 10.0709, limitedOptics: 10.7857, carryOptics: 10.6658, production: 10.0864, singleStack: 9.9296, revolver: 8.9229, pcc: 14.2458 },
  "09-10": { open: 13.2004, limited: 11.6928, limitedOptics: 11.8718, carryOptics: 11.5703, production: 11.688, singleStack: 9.8766, revolver: 7.5746, pcc: 12.1018 },
  "13-02": { open: 13.7867, limited: 11.2734, limitedOptics: 13.1483, carryOptics: 12.9227, production: 11.5497, singleStack: 11.0609, revolver: 11.0759, pcc: 16.5978 },
  "13-04": { open: 13.7116, limited: 12.1329, limitedOptics: 12.1661, carryOptics: 12.1657, production: 11.7612, singleStack: 11.8149, revolver: 9.6401, pcc: 16.3487 },
  "13-05": { open: 11.9573, limited: 10.5496, limitedOptics: 11.0382, carryOptics: 10.4226, production: 10.0557, singleStack: 9.7767, revolver: 7.8119, pcc: 10.7925 },
  "13-06": { open: 9.7524, limited: 8.6031, limitedOptics: 8.7345, carryOptics: 8.4887, production: 8.2698, singleStack: 8.4155, revolver: 6.5666, pcc: 8.8563 },
  "18-03": { open: 8.1979, limited: 7.5523, limitedOptics: 7.1931, carryOptics: 7.1931, production: 7.2358, singleStack: 7.5886, revolver: 6.018, pcc: 8.7976 },
  "18-05": { open: 10.5996, limited: 8.6724, limitedOptics: 9.3661, carryOptics: 9.3661, production: 8.6994, singleStack: 8.7281, revolver: 7.0033, pcc: 10.8634 },
  "18-07": { open: 9.5927, limited: 8.4875, limitedOptics: 8.6889, carryOptics: 8.4808, production: 8.406, singleStack: 8.1307, revolver: 6.2186, pcc: 9.7127 },
  "18-08": { open: 6.6239, limited: 5.9765, limitedOptics: 6.1239, carryOptics: 6.1239, production: 5.8198, singleStack: 5.9229, revolver: 5.0887, pcc: 6.6349 },
  "18-09": { open: 10.8722, limited: 9.9868, limitedOptics: 9.8631, carryOptics: 9.8081, production: 9.7043, singleStack: 9.8039, revolver: 7.9523, pcc: 10.4337 },
  "19-01": { open: 11.0015, limited: 9.3088, limitedOptics: 9.8182, carryOptics: 9.4976, production: 8.7615, singleStack: 8.8474, revolver: 7.3639, pcc: 10.9518 },
  "19-02": { open: 10.5263, limited: 9.2994, limitedOptics: 9.7586, carryOptics: 9.7586, production: 8.8605, singleStack: 8.5759, revolver: 6.8682, pcc: 10.5852 },
  "19-04": { open: 11.2291, limited: 9.7688, limitedOptics: 9.9605, carryOptics: 9.8287, production: 9.3669, singleStack: 9.4492, revolver: 7.4355, pcc: 10.4266 },
  "20-01": { open: 9.1465, limited: 8.1732, limitedOptics: 8.3384, carryOptics: 8.3266, production: 7.9009, singleStack: 6.9487, revolver: 5.7448, pcc: 8.6602 },
  "20-02": { open: 12.9051, limited: 11.4445, limitedOptics: 11.7386, carryOptics: 11.5162, production: 10.8952, singleStack: 10.147, revolver: 8.1171, pcc: 12.6515 },
  "20-03": { open: 11.1878, limited: 9.8941, limitedOptics: 10.2338, carryOptics: 10.2338, production: 9.211, singleStack: 8.2215, revolver: 6.6615, pcc: 10.992 },
  "21-01": { open: 17.443, limited: 14.2892, limitedOptics: 14.9063, carryOptics: 14.8079, production: 13.2046, singleStack: 13.3487, revolver: 10.436, pcc: 16.6464 },
  "22-01": { open: 9.3689, limited: 8.1166, limitedOptics: 8.5411, carryOptics: 8.4433, production: 7.8822, singleStack: 8.0243, revolver: 6.66, pcc: 9.8826 },
  "22-02": { open: 8.4795, limited: 7.2761, limitedOptics: 7.6366, carryOptics: 7.6202, production: 7.2952, singleStack: 7.7577, revolver: 6.3608, pcc: 9.0787 },
  "22-04": { open: 12.0442, limited: 10.2002, limitedOptics: 10.8522, carryOptics: 10.4061, production: 9.6929, singleStack: 10.1448, revolver: 8.2006, pcc: 11.4915 },
  "22-06": { open: 13.4761, limited: 12.2087, limitedOptics: 12.3901, carryOptics: 12.3638, production: 11.7798, singleStack: 11.5577, revolver: 9.8151, pcc: 15.8662 },
  "22-07": { open: 10.1495, limited: 9.0338, limitedOptics: 9.1462, carryOptics: 9.0749, production: 8.539, singleStack: 7.8134, revolver: 6.9661, pcc: 9.5938 },
  "23-01": { open: 11.2515, limited: 9.706, limitedOptics: 10.487, carryOptics: 10.487, production: 9.4988, singleStack: 8.5915, revolver: 7.1461, pcc: 10.7982 },
  "23-02": { open: 11.6034, limited: 10.3271, limitedOptics: 10.747, carryOptics: 10.747, production: 10.3769, singleStack: 10.1621, revolver: 8.6939, pcc: 11.8749 },
  "24-01": { open: 11.6816, limited: 10.8953, limitedOptics: 10.8972, carryOptics: 10.8586, production: 10.631, singleStack: 9.9424, revolver: 8.2044, pcc: 11.7189 },
  "24-02": { open: 10.5066, limited: 8.7133, limitedOptics: 9.6515, carryOptics: 9.6515, production: 8.3501, singleStack: 7.6699, revolver: 6.759, pcc: 10.1819 },
  "24-04": { open: 10.2616, limited: 9.1569, limitedOptics: 9.4176, carryOptics: 9.4176, production: 9.5393, singleStack: 9.173, revolver: 7.4871, pcc: 11.52 },
  "24-06": { open: 12.5441, limited: 9.5424, limitedOptics: 11.0953, carryOptics: 11.0953, production: 8.5693, singleStack: 7.5102, revolver: 5.9393, pcc: 11.8618 },
  "24-08": { open: 13.5619, limited: 9.4982, limitedOptics: 10.6907, carryOptics: 10.6907, production: 9.3193, singleStack: 8.8833, revolver: 6.7558, pcc: 13.0223 },
  "24-09": { open: 11.4304, limited: 9.9065, limitedOptics: 10.4636, carryOptics: 10.4636, production: 9.3329, singleStack: 9.0835, revolver: 6.8147, pcc: 11.5656 },
  "99-08": { open: 10.248, limited: 8.9179, limitedOptics: 9.199, carryOptics: 9.1872, production: 8.6815, singleStack: 8.8712, revolver: 6.9174, pcc: 10.2665 },
  "99-10": { open: 10.7383, limited: 9.464, limitedOptics: 9.6792, carryOptics: 9.5108, production: 9.6784, singleStack: 8.8809, revolver: 7.2673, pcc: 11.1087 },
  "99-11": { open: 12.1268, limited: 10.5552, limitedOptics: 10.5956, carryOptics: 10.3391, production: 10.1008, singleStack: 9.9873, revolver: 7.7012, pcc: 12.6276 },
  "99-12": { open: 10.327, limited: 8.6208, limitedOptics: 8.9675, carryOptics: 8.8556, production: 8.2024, singleStack: 8.2333, revolver: 6.3698, pcc: 9.6315 },
  "99-13": { open: 9.1619, limited: 8.1491, limitedOptics: 7.9572, carryOptics: 7.8905, production: 7.8517, singleStack: 7.8627, revolver: 7.0364, pcc: 11.446 },
  "99-19": { open: 6.822, limited: 6.072, limitedOptics: 6.4275, carryOptics: 6.2113, production: 5.7621, singleStack: 5.6807, revolver: 4.2812, pcc: 5.6574 },
  "99-28": { open: 11.0113, limited: 9.6007, limitedOptics: 9.8941, carryOptics: 9.7171, production: 9.5264, singleStack: 9.2292, revolver: 7.281, pcc: 11.2029 },
  "99-42": { open: 10.6028, limited: 8.8533, limitedOptics: 9.6434, carryOptics: 9.1863, production: 8.7342, singleStack: 8.5122, revolver: 6.6855, pcc: 9.7524 },
  "99-46": { open: 9.5514, limited: 8.7102, limitedOptics: 8.5262, carryOptics: 8.385, production: 8.344, singleStack: 8.5748, revolver: 7.094, pcc: 12.3707 },
  "99-53": { open: 7.8809, limited: 6.5956, limitedOptics: 7.3626, carryOptics: 7.1774, production: 6.6737, singleStack: 6.6368, revolver: 4.4796, pcc: 7.4067 },
  "99-57": { open: 8.2959, limited: 6.5598, limitedOptics: 8.0864, carryOptics: 7.78, production: 6.5202, singleStack: 6.1842, revolver: 5.1125, pcc: 8.4614 },
  "99-62": { open: 12.6035, limited: 11.0471, limitedOptics: 12.1807, carryOptics: 11.6369, production: 10.9717, singleStack: 10.8877, revolver: 9.7967, pcc: 15.4212 },
};
