const fields = [
  {
    key: "name",
    flag: "name",
    type: "select"
  },

  {
    key: "element",
    flag: "element",
    type: "multi",
    values: [
      "Ice",
      "Grass",
      "Fire",
      "Electric",
      "Light",
      "Dark",
      "Ground",
      "Water",
      "Air",
      "Normal"
    ]
  },

  {
    key: "rarity",
    flag: "rarity",
    type: "multi",
    values: [
      "Common",
      "Uncommon",
      "Rare",
      "Exotic",
      "Legendary",
      "Mythical"
    ]
  },

  {
    key: "role",
    flag: "role",
    type: "multi",
    values: [
      "Frontline",
      "Support",
      "Duelist",
      "Phantom",
      "Mastermind"
    ]
  },

  {
    key: "ability",
    flag: "ability",
    type: "multi",
    values: [
      "Opening Guard",
      "Last Stand",
      "Mending Light",
      "War Chant",
      "Riposte",
      "Bloodlust",
      "Shadowstep",
      "Phantom Rebound",
      "Checkmate",
      "Mind Games"
    ]
  },

  {
    key: "locked",
    flag: "locked",
    type: "toggle",
    values: [
      "Yes",
      "No"
    ]
  },

  {
    key: "ethereal",
    flag: "ethereal",
    type: "toggle",
    values: [
      "Yes",
      "No"
    ]
  },

  {
    key: "grade",
    flag: "grade",
    type: "multi",
    values: [
      "D",
      "C",
      "B",
      "A",
      "S",
      "S+"
    ]
  }
];

module.exports = fields;