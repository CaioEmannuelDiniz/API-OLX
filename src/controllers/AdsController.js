const { v4: uuid } = require("uuid");
const jimp = require("jimp");
const ObjectId = require("mongoose");
const fs = require("fs");

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

    if (cat.length < 12) {
      res.json({ error: "Categoria inválido" });
      return;
    }

    if (!ObjectId.isValidObjectId(cat)) {
      res.json({ error: "Tipo de Id inválido" });
      return;
    }

    const category = await Category.findById(cat);
    if (!category) {
      res.json({ error: "Categoria inexistente" });
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
        for (let i = 0; i < req.files.img.length; i++) {
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

    if (newAd.images.length > 0) {
      newAd.images[0].default = true;
    }

    const info = await newAd.save();

    res.json({ id: info._id });
  },
  getList: async (req, res) => {
    let { sort = "asc", offset = 0, limit = 0, q, cat, state } = req.query;

    let filters = { status: true };

    let total = 0;

    if (q) {
      filters.title = { $regex: q, $options: "i" };
    }

    if (cat) {
      const c = await Category.findOne({ slug: cat }).exec();

      if (c) {
        filters.category = c._id.toString();
      }
    }

    if (state) {
      const s = await StateModel.findOne({ name: state.toUpperCase() }).exec();

      if (s) {
        filters.state = s._id.toString();
      }
    }

    const adsTotal = await Ad.find(filters).exec();

    total = adsTotal.length;

    const adsData = await Ad.find(filters)
      .sort({ dateCreatead: sort == "desc" ? -1 : 1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .exec();

    let ads = [];
    for (let i in adsData) {
      let image;

      let defaultImg = adsData[i].images.find((e) => e.default);

      if (defaultImg) {
        image = `${process.env.BASE}/media/${defaultImg.url}`;
      } else {
        image = `${process.env.BASE}/media/default.jpg`;
      }

      ads.push({
        id: adsData[i]._id,
        title: adsData[i].title,
        price: adsData[i].price,
        priceNegotiable: adsData[i].priceNegotiable,
        image,
      });
    }

    res.json({ ads: ads, total: total });
  },
  getItem: async (req, res) => {
    let { id, other = null } = req.query;

    if (!id) {
      res.json({ error: "Sem Produto" });
      return;
    }

    if (id.length < 12) {
      res.json({ error: "Id inválido" });
      return;
    }

    //validação do id 100%
    if (!ObjectId.isValidObjectId(id)) {
      res.json({ error: "Tipo de Id inválido" });
      return;
    }

    const ad = await Ad.findById(id);
    if (!ad) {
      res.json({ error: "Produto Inexistente" });
      return;
    }

    ad.views++;
    await ad.save();

    let images = [];

    for (let i in ad.images) {
      images.push(`${process.env.BASE}/media/${ad.images[i].url}`);
    }

    let category = await Category.findById(ad.category).exec();

    let userInfo = await User.findById(ad.idUser).exec();

    let stateInfo = await StateModel.findById(ad.state).exec();

    let others = [];

    if (others) {
      const otherData = await Ad.find({
        status: true,
        idUser: ad.idUser,
      }).exec();

      for (let i in otherData) {
        if (otherData[i]._id.toString() != ad._id.toString()) {
          let image = `${process.env.BASE}/media/default.jpg`;

          let defaultImg = otherData[i].images.find((e) => e.default);

          if (defaultImg) {
            image = `${process.env.BASE}/media/${defaultImg.url}`;
          }

          other.push({
            id: otherData[i]._id,
            title: otherData[i].title,
            price: otherData[i].price,
            priceNegotiable: otherData[i].priceNegotiable,
            image,
          });
        }
      }
    }

    res.json({
      id: ad._id,
      title: ad.title,
      price: ad.price,
      priceNegotiable: ad.priceNegotiable,
      description: ad.description,
      dateCreated: ad.dateCreated,
      views: ad.views,
      images,
      category,
      userInfo: {
        name: userInfo.name,
        email: userInfo.email,
      },
      stateName: stateInfo.name,
      others,
    });
  },
  editAction: async (req, res) => {
    let { id } = req.params;

    let { title, status, price, priceneg, desc, cat, images, token } = req.body;

    if (id.length < 12) {
      res.json({ error: "Id inválido" });
      return;
    }

    //validação do id 100%
    if (!ObjectId.isValidObjectId(id)) {
      res.json({ error: "Tipo de Id inválido" });
      return;
    }

    const ad = await Ad.findById(id).exec();

    if (!ad) {
      res.json({ error: "Anúncio inexistente" });
      return;
    }

    const user = await User.findOne({ token }).exec();

    if (user._id.toString() !== ad.idUser) {
      res.json({ error: "Este anúncio não é seu" });
      return;
    }

    //função extra de deletar as imagens antigas da pasta media
    console.log(`O anúncio possui ${ad.images.length} arquivos`);

    if (ad.images.length != 0) {
      console.log("Entrou no modo delete arquivo da pasta media");
      for (let i = 0; i < ad.images.length; i++) {
        let imageDelete = ad.images[i].url;
        console.log(`${imageDelete}`);
        fs.unlink(`./public/media/${imageDelete}`, function (err) {
          if (err) throw err;
          console.log(`Arquivo deletado! ${imageDelete} da pasta media`);
        });
      }
    }

    let updates = {};

    if (title) {
      updates.title = title;
    }

    if (price) {
      price = price.replace(".", "").replace(",", ".").replace("R$ ", "");

      price = parseFloat(price);
      updates.price = price;
    }

    if (priceneg) {
      updates.priceNegotiable = priceneg;
    }

    if (status) {
      updates.status = status;
    }

    if (desc) {
      updates.description = desc;
    }

    if (cat) {
      const category = await Category.findOne({ slug: cat }).exec();

      if (!category) {
        res.json({ error: "categoria inexistente" });
        return;
      }

      updates.category = category._id.toString();
    }

    if (images) {
      updates.images = images;
    }

    //TODO NOVAS IMAGES
    //verificar se ta recebendo uma ou demais imagens
    //receber uma ou mais imagens
    //fazer o upload dela
    //e depois salvar a imagem no produto

    let newImages = [];

    if (req.files && req.files.img) {
      //possui apenas uma imagem
      console.log("possui arquivo para ser enviado");
      if (req.files.img.length == 0 || req.files.img.length == undefined) {
        console.log("se possui apenas 1 arquivo ou nenhum entra aqui");
        if (
          ["image/jpeg", "image/jpg", "image/png"].includes(
            req.files.img.mimetype
          )
        ) {
          let url = await addImage(req.files.img.data);

          console.log(`imagem: ${url} ENVIADA`);

          newImages.push({
            url: url,
            default: false,
          });
          console.log("Modo envio de uma imagem finalizado ");
        }
      } else {
        console.log("se possui mais de 1 arquivo entra aqu");
        //possui mais de uma imagem
        for (let i = 0; i < req.files.img.length; i++) {
          //se a imagem for dos tipos informado
          if (
            ["image/jpeg", "image/jpg", "image/png"].includes(
              req.files.img[i].mimetype
            )
          ) {
            let url = await addImage(req.files.img[i].data);

            console.log(`imagem ${[i]}: ${url} ENVIADA`);

            newImages.push({
              url: url,
              default: false,
            });
          }
        }
        console.log("Modo envio de mais de uma imagem finalizado +1 ");
      }
      updates.images = newImages;
    }

    console.log(newImages.length);
    if (newImages.length > 0) {
      updates.images[0].default = true;
    }

    await Ad.findByIdAndUpdate(id, { $set: updates });

    res.json({ message: "Sucesso na alteração" });
  },
};
