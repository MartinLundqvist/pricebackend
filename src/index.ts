import axios from 'axios';
import cheerio from 'cheerio';
import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

interface IVendorSearchResult {
  vendor: string;
  product: string;
  price: string;
}

interface IProductSearchResult {
  product: string;
  link: string;
}

interface IResponse {
  product: IProductSearchResult;
  vendors: IVendorSearchResult[];
}

const start = () => {
  app.get('/find/:search', async (req, res) => {
    const { search } = req.params;

    const product = await fetchProduct(search);

    const vendors = await fetchStores(product.link);

    const results: IResponse = { product, vendors };

    res.status(200).send(JSON.stringify(results));
  });

  app.listen(4000, () => {
    console.log('Listening on port 4000');
  });
};

const fetchProduct = async (search: string): Promise<IProductSearchResult> => {
  const date = new Date().toLocaleString();
  console.log(date + ': Receieved searchwords ' + search);
  var results: IProductSearchResult = { product: '', link: '' };

  try {
    const { data } = await axios.get(
      `https://pricerunner.se/results?q=${search}`
    );

    const $ = cheerio.load(data);

    const targetProduct = $('h3')[0];

    const targetLink = $(targetProduct)
      .parent()
      .parent()
      .parent()
      .parent()
      .parent();

    const results = {
      product: $(targetProduct).text() || 'no found',
      link: 'https://pricerunner.se' + $('a', targetLink).attr('href') || '',
    };
  } catch (err) {
    console.log('Something went wrong while fetching product!');
    console.log(err);
  }

  return results;
};

const fetchStores = async (url: string): Promise<IVendorSearchResult[]> => {
  const date = new Date().toLocaleString();
  console.log(date + ': Scraping ' + url);
  var results: IVendorSearchResult[] = [];

  try {
    const { data } = await axios.get(url);

    const $ = cheerio.load(data);

    const vendorSelector =
      '#product-body > div.FKse_kiJXC > div > div.vQOkVLmS99.JpHTC3gnJ6 > div.MFbHUJ3qvl > div > div > div.EUXXvl3ByR.css-19thj06 > div';

    $(vendorSelector).each((i, element) => {
      const attribute = $(element).attr('aria-label');

      var vendor = '';
      var price = '';
      var product = '';

      // If this attribute exists, it is a partner company, we parse accordingly
      if (attribute) {
        vendor = attribute.split(',')[0];
        product = $('div.Rj1ZIdJtHj.LfnWqDQEC_.css-qt1ys4 > p', element).text();
      } else {
        vendor = $(
          'p.SnarOLmYcb.QTqr3FhD08.CMnSARKXkC.eSiwcTiHBc.qzyF__rcJz.css-ai0pqp',
          element
        ).text();
        product = $(
          'p.SnarOLmYcb.J0LD8ZkjaI.vi8fZFqHqP.eSiwcTiHBc.RM90jzC6co.css-ai0pqp',
          element
        ).text();
      }

      // The price can always be found at the same place. We need to remove 'fr.', 'kr' and any additional empty spaces.
      price = $('div.css-guoxna > span', element)
        .text()
        .replace('fr.', '')
        .slice(0, -3)
        .replace(' ', '');

      if (vendor !== '') {
        console.log(
          'At entry ' + i + '> ' + vendor + ': ' + product + ' : ' + price
        );
        results = [...results, { vendor, product, price }];
      }
    });
  } catch (err) {
    console.log('Something went wrong white fetching vendor offerings!');
    console.log(err);
    results = [];
  }

  // console.log(results);

  return results;
};

// const results = fetchStores(
//   'https://www.pricerunner.se/pl/94-4341520/Hoerlurar-Gaming-Headsets/Bose-QuietComfort-35-2-priser'
// );

start();

// fetchTest(
//   'https://www.pricerunner.se/pl/94-4341520/Hoerlurar-Gaming-Headsets/Bose-QuietComfort-35-2-priser'
// );
