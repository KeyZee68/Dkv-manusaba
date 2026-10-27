import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCJJ-9AIJ-AwZPdRCMe0ZL3jM-0vxtJjo0",
  authDomain: "web-xii-dkv.firebaseapp.com",
  projectId: "web-xii-dkv",
  storageBucket: "web-xii-dkv.firebasestorage.app",
  messagingSenderId: "245439774423",
  appId: "APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

setPersistence(auth, browserSessionPersistence).catch(console.error);

const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
