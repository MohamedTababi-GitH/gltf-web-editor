export const ECADCategory = {
  Passive: "Passive Components",
  Active: "Active Components",
  IC: "Integrated Circuits (ICs)",
  Connector: "Connectors",
  Power: "Power Management",
  RF: "RF & Microwave",
  Opto: "Optoelectronics",
  SwitchRelay: "Switches & Relays",
  Mechanical: "Mechanical & Hardware",
  Sensor: "Sensors & Transducers",
} as const;

export type Category = (typeof ECADCategory)[keyof typeof ECADCategory];
