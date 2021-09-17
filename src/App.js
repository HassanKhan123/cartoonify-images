import React, { useState, useRef, useEffect } from 'react';

import {
  RemoveBgResult,
  RemoveBgError,
  removeBackgroundFromImageFile,
  removeBackgroundFromImageUrl,
  removeBackgroundFromImageBase64,
} from 'remove.bg';
import html2canvas from 'html2canvas';

import axios from 'axios';
import Background1 from './xord.jpg';
import Background2 from './background2.jpg';
import Background3 from './background3.jpg';
import Background4 from './background4.jpeg';

// let model = require('./models/CartoonGAN/web-uint8/model.json');
import modelURL from './CartoonGAN/web-uint8/model.json';

const App = () => {
  // console.log(model);
  const [fullFile, setFullFile] = useState(null);
  const [model, setModel] = useState();
  const [files, setFile] = useState(null);
  const [originalFile, setOriginalFile] = useState(null);
  const [convertedImage, setConvertedImage] = useState(null);
  const [cartoonImg, setCartoonImg] = useState(null);
  const [finalImg, setFinalImg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bg, setBg] = useState(Background1);
  const [finalImageURL, setFinalImgURL] = useState(null);

  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const [App, setApp] = useState({
    model: '',
    size: 384,
    source: imageRef.current,
    canvas: canvasRef.current,
    path: '',
    // path: model,
  });

  useEffect(() => {
    if (convertedImage) {
      loadModel();
    }
  }, [convertedImage]);

  async function loadModel(url) {
    setLoading(true);
    try {
      const model = await window.tf.loadGraphModel(
        // modelURL,
        // 'http://127.0.0.1:8080/CartoonGAN/web-uint8/model.json',
        // 'http://127.0.0.1:8081/CartoonGAN/web-uint8/model.json',
        // 'https://gitex-demo.web.app/CartoonGAN/web-uint8/model.json',
        // 'http://localhost:5000/',
        'https://firebasestorage.googleapis.com/v0/b/gitex-demo.appspot.com/o/models%2Fmodel.json?alt=media&token=64bd8fa4-815f-4e3b-8140-8a2f5d8ba617',
      );

      setApp({
        ...App,
        model,
      });

      // predict(imageRef.current, model);
      try {
        console.log('PREDICT RAN============================');
        let img = window.tf.browser.fromPixels(imageRef.current);
        const shape = img.shape;
        const [w, h] = shape;
        img = normalize(img);
        console.log('PRED');
        const t0 = performance.now();
        const timer = performance.now() - t0;
        let img_out;

        try {
          const result = await model.predict(img, { batchSize: 1 });
          console.log('RES================', result);
          img_out = await result
            .squeeze()
            .sub(window.tf.scalar(-1))
            .div(window.tf.scalar(2))
            .clipByValue(0, 1);
          const pad = Math.round((Math.abs(w - h) / Math.max(w, h)) * App.size);
          const slice = w > h ? [0, pad, 0] : [pad, 0, 0];
          img_out = img_out.slice(slice);
          console.log('IMAGE OUT,', img_out, shape);
          draw(img_out, shape);
          console.log(Math.round((timer / 1000) * 10) / 10);
          console.log('RESULT=============', img);
        } catch (error) {
          console.log('ERROR============', error);
        }
      } catch (error) {
        console.log('ERRR===================', error);
        console.warn('WARN ==================', error);
        setConvertedImage(null);
      }

      setModel(url);
      console.log('Load model success');
    } catch (err) {
      setConvertedImage(null);
      console.log(err);
      setLoading(false);
    }
  }

  // http-server -c1 --cors .

  const convertBase64 = file => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onload = () => {
        resolve(fileReader.result);
      };
      fileReader.onerror = error => {
        reject(error);
      };
    });
  };

  const uploadImage = async e => {
    let files = e.target.files[0];
    console.log('FILES===================', files);
    setFullFile(files);
    const base64 = await convertBase64(files);
    setOriginalFile(base64);

    setFile(URL.createObjectURL(files));
  };

  const removeBg = async e => {
    e.preventDefault();
    // setFinalImg(originalFile);
    setConvertedImage(originalFile);
    // const options = {
    //   method: 'POST',
    //   headers: { 'Rm-Token': '61435e6389cc86.81026729' },
    //   data: {
    //     image_file: originalFile,
    //   },
    //   url: 'https://api.removal.ai/3.0/remove',
    // };
    // const data = await axios(options);
    // console.log('DATA===========', data);

    // console.log('DATA===============', data);
  };
  function normalize(img) {
    const [w, h] = img.shape;
    // pad
    const pad =
      w > h
        ? [
            [0, 0],
            [w - h, 0],
            [0, 0],
          ]
        : [
            [h - w, 0],
            [0, 0],
            [0, 0],
          ];
    img = img.pad(pad);
    const size = App.size;
    img = window.tf.image
      .resizeBilinear(img, [size, size])
      .reshape([1, size, size, 3]);
    const offset = window.tf.scalar(127.5);
    return img.sub(offset).div(offset);
  }

  function draw(img, size) {
    const scaleby = size[0] / img.shape[0];
    window.tf.browser.toPixels(img, canvasRef.current);

    setTimeout(() => scaleCanvas(scaleby), 50);
  }

  function scaleCanvas(pct = 2) {
    setLoading(false);
    const canvas = canvasRef.current;
    console.log('CW===========', canvas);
    const tmpcan = document.createElement('canvas');
    const tctx = tmpcan.getContext('2d');
    const cw = canvas.width;
    const ch = canvas.height;
    tmpcan.width = cw;
    tmpcan.height = ch;
    tctx.drawImage(canvas, 0, 0);
    canvas.width *= pct;
    canvas.height *= pct;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(tmpcan, 0, 0, cw, ch, 0, 0, cw * pct, ch * pct);

    console.log('object,', canvas.toDataURL('image/jpeg'));
    setCartoonImg(canvas.toDataURL('image/jpeg'));
    setFinalImg(canvas.toDataURL('image/jpeg'));

    // setConvertedImage(canvas.toDataURL('image/jpeg'));
    // removeBackgroundFromImageBase64({
    //   base64img: canvas.toDataURL('image/jpeg'),
    //   apiKey: 'H9MbXd7iFXGubSK38MvHfdUu',
    //   size: 'full',
    //   type: 'auto',
    // })
    //   .then(async result => {
    //     console.log('RESULT======', result);
    // setFinalImg('data:image/png;base64, ' + result.base64img);
    //   })
    //   .catch(errors => {
    //     console.log(JSON.stringify(errors));
    //     setLoading(false);
    //   });
    // App.download.href = canvas.toDataURL('image/jpeg');
  }

  const downloadImage = () => {
    html2canvas(document.getElementById('finalImg')).then(canvas => {
      console.log('CANVAS============', canvas.toDataURL());
      canvas.toDataURL();

      setFinalImgURL(canvas.toDataURL());
    });
  };

  return (
    <div className='App'>
      <h1>Remove Background From Image</h1>
      <form onSubmit={removeBg}>
        <div>
          <input type='file' onChange={uploadImage} />
        </div>
        {files && <img src={files} height={400} width={400} ref={imageRef} />}
        <div>
          <button>Remove Background</button>
        </div>
      </form>
      {loading && <h3>Loading...</h3>}
      <canvas ref={canvasRef}></canvas>
      {/* 61435e6389cc86.81026729 */}
      {/* {convertedImage && (
        <div>
          <h1>New Image</h1>
          <div style={{ display: 'flex' }}>
            {convertedImage && (
              <img
                src={convertedImage}
                ref={imageRef}
                height={400}
                width={400}
              />
            )}
          </div>
        </div>
      )} */}

      {/* {convertedImage && (
        <main>
          <div
            id='finalImg'
            className='bg1'
            style={{ backgroundImage: `url(${bg})` }}
          >
            <img src={convertedImage} />
          </div>
        </main>
      )} */}
      {/* {convertedImage && (
        <div style={{ display: 'flex' }}>
          <div
            style={{
              backgroundImage: `url(${Background1})`,
              height: 700,
              width: 500,
            }}
            onClick={() => setBg(Background1)}
          ></div>
          <div
            style={{
              backgroundImage: `url(${Background2})`,
              height: 500,
              width: 500,
            }}
            onClick={() => setBg(Background2)}
          ></div>

          <div
            style={{
              backgroundImage: `url(${Background3})`,
              height: 500,
              width: 500,
            }}
            onClick={() => setBg(Background3)}
          ></div>
          <div
            style={{
              backgroundImage: `url(${Background4})`,
              height: 500,
              width: 500,
            }}
            onClick={() => setBg(Background4)}
          ></div>
        </div>
      )} */}
    </div>
  );
};

export default App;
