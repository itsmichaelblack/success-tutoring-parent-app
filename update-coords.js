const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

const app = initializeApp({
  apiKey: 'AIzaSyDG1LOpFz05Ty9_J7IO6XQvKUJnLTXoriE',
  projectId: 'success-tutoring-test',
});
const db = getFirestore(app);

const coords = {
  '0bs9VAv9UfTOwTDSbSqj': { lat: -37.6001, lng: 144.9459 },   // Craigieburn VIC
  '17y7MyH0gDLKYvrLB056': { lat: -38.1821, lng: 144.3542 },   // Belmont VIC
  '2NsZo6wi6d4kNuu8yvBC': { lat: -31.7445, lng: 115.7662 },   // Joondalup WA
  '3IuTIovoqyxNKDXcz34j': { lat: -33.7031, lng: 150.9064 },   // The Ponds NSW
  '3zaM2L5PbENVTaXTPEOt': { lat: -32.2394, lng: 115.7702 },   // Kwinana WA
  '4OlAtD7KLVNmiR8R442f': { lat: -33.7506, lng: 150.6942 },   // Penrith NSW
  '6PoF7fWZvotptelxKWMI': { lat: -33.9031, lng: 150.9329 },   // Green Valley NSW
  '6fFzx3LmStQQgaXOvmEM': { lat: -34.0293, lng: 150.7744 },   // Gregory Hills NSW
  '8QNXlgVkVMLR1QtStGXC': { lat: -32.0554, lng: 115.9192 },   // Canning Vale WA
  'ACpbmHHoNomyFghsfQcG': { lat: -27.2340, lng: 153.0046 },   // North Lakes QLD
  'BAXZlH3r6Yk17M7GIb02': { lat: -36.9083, lng: 174.6840 },   // New Lynn Auckland NZ
  'DMvXYbUGknxrhwdJHgDZ': { lat: -33.7744, lng: 150.9361 },   // Seven Hills NSW
  'EZAoS30wgBcT6qq9RNyx': { lat: -37.9496, lng: 145.1530 },   // Springvale VIC
  'Ev1KtYeEQyaPsdTvCsKT': { lat: -33.6798, lng: 150.8614 },   // Riverstone NSW
  'FBhwD7Z1MXkz54Clwwbk': { lat: -37.6500, lng: 145.0167 },   // Epping VIC
  'GMznM2ysw7RZ7Si1yM4Y': { lat: -37.8682, lng: 144.8310 },   // Altona VIC
  'IuXG2Eg7rZX8VneUwESC': { lat: -37.9057, lng: 144.9906 },   // Brighton VIC
  'Jp849lGgQ7gtkklZMxH5': { lat: -33.7560, lng: 151.1530 },   // Gordon NSW
  'KH2f67MklP8qHhWYYijj': { lat: -27.3860, lng: 153.0314 },   // Chermside QLD
  'KunPytQG7WAS9D71bu0K': { lat: -33.8775, lng: 151.1039 },   // Burwood NSW
  'L2WEYj8zKnsTKMHPSF6c': { lat: -31.9875, lng: 116.0068 },   // Forrestfield WA
  'L3g66THtBML7K45rWi51': { lat: -33.7673, lng: 150.8215 },   // Mount Druitt NSW
  'LPVdWJlZrU3ZyZzr90e2': { lat: -33.7969, lng: 151.1802 },   // Chatswood NSW
  'MNFW6HojOdnYH8bm0y8I': { lat: -33.8364, lng: 150.9908 },   // Merrylands NSW
  'OlHEqj4TtoJBxQZvdJ8l': { lat: -33.9668, lng: 151.0996 },   // Hurstville NSW
  'P9vlAT1TxhiWTzt1Zrjx': { lat: -32.3249, lng: 115.7832 },   // Baldivis WA
  'PNSkpHFy6juUIpnpWo8T': { lat: -34.8830, lng: 138.6570 },   // Windsor Gardens / Paradise SA
  'PXoUZJrX71rQu4Q1vbjR': { lat: -36.9024, lng: 174.7365 },   // Mt Roskill Auckland NZ
  'QEDWER2W2nRj760cyQQE': { lat: -33.7041, lng: 151.0993 },   // Hornsby NSW
  'QgbOZkb4UyIcfnO1Gfwq': { lat: -31.9810, lng: 115.7816 },   // Claremont WA
  'QwH7jXhTl6miGS9pGtPC': { lat: -37.8987, lng: 144.6614 },   // Werribee VIC
  'SBA0ds84bhdIvGHEaQ7h': { lat: -33.8630, lng: 151.0469 },   // Lidcombe NSW
  'TgNVGm2NkOjtDs2OMyfB': { lat: -33.8073, lng: 150.9675 },   // Wentworthville NSW
  'UydxiT3dCrdcITvc6mNE': { lat: -31.9080, lng: 115.8574 },   // Yokine WA
  'V9YpZsj2ARTmKGQ1f5Uv': { lat: 42.2930, lng: -83.0125 },   // Windsor ON Canada
  'VnOo879fOnRjUGfMSPcq': { lat: -33.8235, lng: 151.0080 },   // Harris Park / Parramatta NSW
  'WMsyJVBDvYbJLcmark1m': { lat: -27.5367, lng: 153.0841 },   // Mt Gravatt East QLD
  'WQxQYk9P14tudHRckevT': { lat: -32.0524, lng: 115.8586 },   // Bull Creek WA
  'XUqFRTwsQU2lTyazIpkq': { lat: -37.8168, lng: 144.7387 },   // Truganina VIC
  'XqWiaArqAyUEh8ZdypXY': { lat: -37.8226, lng: 145.0354 },   // Hawthorn VIC
  'Xr0oyT6lvEnBTDXc2BFl': { lat: -33.8436, lng: 150.9056 },   // Wetherill Park NSW
  'Ym0zMpZB3jKcbTM17ihE': { lat: -36.8610, lng: 174.6150 },   // Westgate Auckland NZ
  'cJcGT8IEp4jKd67tD1Wq': { lat: -33.7780, lng: 151.1266 },   // Macquarie Park / Ryde NSW
  'dYujxw0R3mClO5GV8lGC': { lat: -34.0543, lng: 150.6961 },   // Camden NSW
  'eFZOafeW45BaM86Y9X7p': { lat: -31.7673, lng: 116.0152 },   // Ellenbrook WA
  'gAQ1p48FngfFGneIueE6': { lat: -33.7624, lng: 150.9903 },   // Baulkham Hills NSW
  'hV0wPhbg0wK0bAHttY13': { lat: -33.7688, lng: 150.9063 },   // Blacktown NSW
  'hs9m4GGwTkEMspEZ8AW2': { lat: -37.8152, lng: 144.9459 },   // Docklands VIC
  'kKThglZfseJUQpKzG9QZ': { lat: -33.9175, lng: 151.0357 },   // Bankstown NSW
  'khTom827ojVLcCSJZYGv': { lat: -33.8944, lng: 150.9369 },   // Cabramatta NSW
  'kq8W4DZLjxC1r3KUNXEs': { lat: -41.2127, lng: 174.8973 },   // Lower Hutt NZ
  'ktVNWgAoB36Is7CIKvmg': { lat: -34.0004, lng: 150.8637 },   // Ingleburn NSW
  'niUZ7ZFl1gjs6q8e0hog': { lat: -33.8495, lng: 151.0328 },   // Auburn NSW
  'nnxUYJak9Zg5fbIjPECW': { lat: -33.7727, lng: 151.0819 },   // Epping NSW
  'ntvG3YFcUZpwGCitKTUa': { lat: -34.0650, lng: 150.8142 },   // Campbelltown NSW
  'thP8vGtcNTiESknkJrkF': { lat: -34.0650, lng: 150.8142 },   // Campbelltown NSW (duplicate)
  'urkDX4X5fVUQPUw9i8t5': { lat: -31.9760, lng: 115.8944 },   // Victoria Park WA
  'yFXgcUhWgvg55qr2X6mJ': { lat: -40.3523, lng: 175.6082 },   // Palmerston North NZ
  'z6Xte8eBpWHS1HSrprOb': { lat: -33.9200, lng: 150.9228 },   // Liverpool NSW
  'z7I1or4Na6nIX7x90dTw': { lat: -37.8890, lng: 144.6640 },   // Wyndham Vale VIC
  'zNBN7gCdLoQua3orwNM1': { lat: -37.7406, lng: 144.7350 },   // Caroline Springs VIC
  'zZkrfB3LYjI0iB4NX7Ra': { lat: -33.9544, lng: 151.0344 },   // Panania NSW
  'ziYy7SXI7zFZqIUT3W3a': { lat: -43.5100, lng: 172.5880 },   // Papanui Christchurch NZ
};

async function main() {
  let success = 0;
  let failed = 0;
  
  for (const [id, { lat, lng }] of Object.entries(coords)) {
    try {
      await updateDoc(doc(db, 'locations', id), { lat, lng });
      console.log(`✅ Updated: ${id}`);
      success++;
    } catch (e) {
      console.log(`❌ Failed: ${id} - ${e.message}`);
      failed++;
    }
  }
  
  console.log(`\nDone! ${success} updated, ${failed} failed.`);
  process.exit(0);
}

main();
