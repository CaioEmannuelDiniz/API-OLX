const { v4: uuid } = require("uuid");
const jimp = require("jimp");

const Category = require("../models/Category");
const User = require("../models/User");
const Ad = require("../models/Ad");
const StateModel = require("../models/State");

//função transforma o buffer de uma imagem para salvar
const addImage = async (buffer) => {
  //nome da imagem
  let newName = `${uuid()}.jpg`;
  //let o buffer com o jimp
  let tmpImg = await jimp.read(buffer);
  //redimencionar a imagem 500X500 diminui a qualidade a 80 para melhor ganho e escreve essa imagem no endereço informado
  tmpImg.cover(500, 500).quality(80).write(`./public/media/${newName}`);
  return newName;
};

module.exports = {
  getCategories: async (req, res) => {
    const cats = await Category.find();

    let categories = [];

    for (let i in cats) {
      categories.push({
        ...cats[i]._doc,
        img: `${process.env.BASE}/assets/images/${cats[i].slug}.png`,
      });
    }

    res.json({ categories });
  },
  addAction: async (req, res) => {
    let { title, price, priceneg, desc, cat, token } = req.body;

    const user = await User.findOne({ token }).exec();

    if (!title || !cat) {
      res.json({ error: "Titulo e/ou categoria não foram preenchidos" });
      return;
    }

    //formater valor
    if (price) {
      price = price.replace(".", "").replace(",", ".").replace("R$ ", "");

      price = parseFloat(price);
    } else {
      price = 0;
    }

    const newAd = new Ad();

    newAd.status = true;
    newAd.idUser = user._id;
    newAd.state = user.state;
    newAd.dateCreated = new Date();
    newAd.title = title;
    newAd.category = cat;
    newAd.price = price;
    newAd.priceNegotibale = priceneg == "true" ? true : false;
    newAd.description = desc;
    newAd.views = 0;

    if (req.files && req.files.img) {
      if (req.files.img.length == undefined) {
        if (
          ["image/jpeg", "image/jpg", "image/png"].includes(
            req.files.img.mimetype
          )
        ) {
          let url = await addImage(req.files.img.data);
          newAd.images.push({
            url: url,
            default: false,
          });
        }
      } else {
        for (let i = 0; i < req.files.img.lenght; i++) {
          if (
            ["image/jpeg", "image/jpg", "image/png"].includes(
              req.files.img[i].mimetype
            )
          ) {
            let url = await addImage(req.files.img[i].data);
            newAd.images.push({
              url: url,
              default: false,
            });
          }
        }
      }
    }

    if (newAd.images.lenght > 0) {
      newAd.images[0].default = true;
    }

    const info = await newAd.save();

    res.json({ id: info._id });
  },
  getList: async (req, res) => {
  },
  getItem: async (req, res) => {},
  editAction: async (req, res) => {},
};
