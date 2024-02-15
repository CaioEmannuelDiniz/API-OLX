const mongoose = require("mongoose");
const { validationResult, matchedData } = require("express-validator");
const bcrypt = require("bcrypt");

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
  editAction: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.json({
        error: errors.mapped(),
      });
      return;
    }

    const data = matchedData(req);

    let updates = {};

    //Update nome
    if (data.name) {
      updates.name = data.name;
    }

    //Update Email
    if (data.email) {
      const emailCheck = await User.findOne({ email: data.email });
      if (emailCheck) {
        res.json({ error: "E-mail já existente!" });
        return;
      }
      updates.email = data.email;
    }

    //Update Estado
    if (data.state) {
      if (mongoose.Types.ObjectId.isValid(data.state)) {
        const stateCheck = await State.findById(data.state);

        if (!stateCheck) {
          res.json({ erro: "Estado não existe" });
          return;
        }
        updates.state = data.state;
      } else {
        res.json({ erro: "Código de estado inválido" });
        return;
      }
    }

    //Update Senha
    if (data.password) {
      updates.passwordHash = await bcrypt.hash(data.password, 10);
    }

    await User.findOneAndUpdate({ token: data.token }, { $set: updates });

    res.json({});
  },
};
