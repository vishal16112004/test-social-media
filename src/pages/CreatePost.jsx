import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { ImagePlus, Loader2 } from "lucide-react";

export default function CreatePost() {
    const [caption, setCaption] = useState("");
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(null);
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const uploadToCloudinary = async (file) => {
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

        if (!cloudName || !uploadPreset) {
            throw new Error("Cloudinary configuration missing");
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            {
                method: "POST",
                body: formData,
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Upload failed");
        }

        const data = await response.json();
        return data.secure_url;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!image) return;

        setLoading(true);
        try {
            // 1. Upload to Cloudinary
            const imageUrl = await uploadToCloudinary(image);

            // 2. Add post to Firestore
            await addDoc(collection(db, "posts"), {
                userId: user.uid,
                imageUrl,
                caption,
                likes: [],
                createdAt: serverTimestamp(),
                user: {
                    username: user.displayName || "User",
                    photoURL: user.photoURL
                }
            });

            navigate("/");
        } catch (error) {
            console.error("Error creating post:", error);
            alert("Failed to create post: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">Create New Post</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Image Upload Area */}
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-gray-500 transition-colors">
                    {preview ? (
                        <div className="relative">
                            <img src={preview} alt="Preview" className="max-h-96 mx-auto rounded-lg" />
                            <button
                                type="button"
                                onClick={() => {
                                    setImage(null);
                                    setPreview(null);
                                }}
                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                            >
                                ×
                            </button>
                        </div>
                    ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-4">
                            <ImagePlus size={48} className="text-gray-500" />
                            <span className="text-gray-400">Click to upload photo</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                            />
                        </label>
                    )}
                </div>

                {/* Caption Input */}
                <div>
                    <textarea
                        placeholder="Write a caption..."
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        className="w-full p-4 bg-gray-900 text-white rounded-lg border border-gray-800 focus:outline-none focus:border-blue-500 min-h-[100px]"
                    />
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={!image || loading}
                    className="w-full py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" />
                            Sharing...
                        </>
                    ) : (
                        "Share"
                    )}
                </button>
            </form>
        </div>
    );
}
