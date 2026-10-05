// ขั้นที่ 3 — ใช้ตอน Login: เทียบรหัสผ่านที่กรอกกับ hash (bcrypt) ที่เก็บใน DB
import "dotenv/config";
import Debug from "debug";
import bcrypt from "bcrypt";

const debug = Debug("app:compare");

export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  const isMatch = await bcrypt.compare(password, hash);
  return isMatch;
};

const hashes = [
  "$2b$04$eTJZhao.xVbwO0Nk6r0QR.rXidUh6Q7VQyOXEfOiI.f.1kWKr5GE.",
  "$2b$04$F0diMVVp8QayoVYbpAvlDulU7YHNtkD8Uj11zX3kRfcSYQXkf3g0C",
  "$2b$04$x/qMWRLQC7ZkLaIS81haw.6cP8hhipS1bFcs6BVP90NEUSkb1wl2a",
  "$2b$04$QfAO3rT.rpLg5rMLpVBqgedjekS.GLhT6Sp610myj0SEZLOOE0tj6",
  "$2b$05$427rfEYlN/76vMjck5n2bOUOM1rzL/FyIzn26PvyCxhsSE62fX.5G",
  "$2b$06$7tlphrVyFNgZv11q5zF2pexp7DReAnISEVGzN3ZLw/u.sCMiHuJcS",
  "$2b$07$i6EGvfaYbWBeecVya0bTK.7hOwy3kwMDiG1Ro4Eu362z7/z3L39sW",
  "$2b$08$X1HV7IRxckH.RgqG1jjIYOsRyCQMUiLoawaBfb05uzwQVDgwBVMX2",
  "$2b$09$8RTZjy80LBgrU0i4VRdGbuQQjleozkb7W47K7fqt64m9uM4PktRhS",
  "$2b$10$BuyRls5Tgok0JVFsPZiTU./TUrcGM3jHkTkf.3/Y.5ecY6d/NIJ8a",
  "$2b$11$Cqs1JJ660dzqgipEapnjF.gBeF2b9ONEDV3tyun2Rk/myW8K/yl3.",
  "$2b$12$zXDDP70MIfSsw9HysFcV9uj78i5pK6zWfFTPCvrEC4DBlKqeARh76",
  "$2b$13$dmzM28M74S8WlE9kzCrkWO5x9.M9YoXCAKBxHZvnZtvCPv2s99H9K",
  "$2b$14$GAdDkSvWT.sW4cgMNA5sd.npyWE5s8doMNS2lB4VxVtjJ6V3.4CYu",
  "$2b$15$iZTgg3w.dsuotW4JYTB3S.XhnOWzKPnOOW0NJVWs0nqAYidulJ5Ge",
];

async function main() {
  for (let hash of hashes) {
    const isMatch = await comparePassword("1234", hash);
    debug(isMatch);
  }
}
main();
