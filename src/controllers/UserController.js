const State = require("../models/State");
const User = require("../models/User");
const Category = require("../models/Category");
const Ad = require("../models/Ad");

module.exports = {
  getStates: async (req, res) => {
    let states = await State.find();
    res.json({
      states: states,
    });
  },
  info: async (req, res) => {
    let token = req.query.token;

    const user = await User.findOne({ token });
    const state = await State.findById(user.state);
    const ads = await Ad.find({ IdUser: user._id.toString() });

    let adList = [];
    for (let i in ads) {
      const cat = await Category.findById(ads[i].category);

      adList.push({
        id: ads[i]._id,
        status: ads[i].status,
        images: ads[i].images,
        dateCreated: ads[i].dateCreated,
        tittle: ads[i].tittle,
        price: ads[i].price,
        priceNegotiable: ads[i].priceNegotiable,
        description: ads[i].description,
        views: ads[i].views,
        Category: cat.slug,
      });

      /*
      ATALHO DO QUE FOI ESCRITO DA LINHA 24 ATÉ A LINHA 35
      adList.push({...ads[i],category:cat.slug});
      */
    }

    res.json({
      name: user.name,
      emai: user.email,
      state: state.name,
      ads: adList,
    });
  },
  editAction: async (req, res) => {},
};
