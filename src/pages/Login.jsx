import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import { Link, useNavigate } from "react-router-dom";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate("/");
        } catch (err) {
            setError("Failed to login: " + err.message);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Check if user doc exists, if not create it
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid,
                    username: user.displayName.split(" ").join("").toLowerCase(),
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    bio: "",
                    followers: [],
                    following: []
                });
            }

            navigate("/");
        } catch (err) {
            setError("Failed to login with Google: " + err.message);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-black">
            <div className="w-full max-w-md p-8 bg-gray-900 rounded-lg border border-gray-800">
                <h1 className="text-3xl font-bold text-white mb-6 text-center">Instagram</h1>
                {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
                <form onSubmit={handleLogin} className="space-y-4">
                    <input
                        type="email"
                        placeholder="Email"
                        className="w-full p-3 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:border-blue-500"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        className="w-full p-3 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:border-blue-500"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                        type="submit"
                        className="w-full p-3 bg-blue-500 text-white rounded font-bold hover:bg-blue-600 transition-colors"
                    >
                        Log In
                    </button>
                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-gray-700"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-500 text-sm">OR</span>
                        <div className="flex-grow border-t border-gray-700"></div>
                    </div>
                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="w-full p-3 bg-white text-black rounded font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                    >
                        Continue with Google
                    </button>
                </form>
                <p className="mt-4 text-center text-gray-400">
                    Don't have an account? <Link to="/signup" className="text-blue-500">Sign up</Link>
                </p>
            </div>
        </div>
    );
}
