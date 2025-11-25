import { useState } from "react";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { db, auth } from "../lib/firebase";
import { Loader2, X, Camera } from "lucide-react";

export default function EditProfileModal({ isOpen, onClose, currentUser, profileData, onUpdate, isSetupMode = false }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: profileData?.username || "",
        displayName: profileData?.displayName || "",
        bio: profileData?.bio || "",
        photoURL: profileData?.photoURL || ""
    });
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(profileData?.photoURL || "");

    if (!isOpen) return null;

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
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
        setLoading(true);

        try {
            // Check username uniqueness (strict check for all users)
            const q = query(collection(db, "users"), where("username", "==", formData.username));
            const querySnapshot = await getDocs(q);

            // Check if any document found is NOT the current user
            const isTaken = querySnapshot.docs.some(doc => doc.id !== currentUser.uid);

            if (isTaken) {
                alert("Username is already taken. Please choose another one.");
                setLoading(false);
                return;
            }

            let photoURL = formData.photoURL;

            if (imageFile) {
                photoURL = await uploadToCloudinary(imageFile);
            }

            const updates = {
                username: formData.username,
                displayName: formData.displayName,
                bio: formData.bio,
                photoURL: photoURL,
                isProfileComplete: true
            };

            // Update Firestore
            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, updates);

            // Update Auth Profile
            await updateProfile(auth.currentUser, {
                displayName: formData.displayName,
                photoURL: photoURL
            });

            onUpdate(updates);
            onClose();

            // Remove setup param if present
            const url = new URL(window.location);
            if (url.searchParams.get("setup")) {
                url.searchParams.delete("setup");
                window.history.replaceState({}, "", url);
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to update profile: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-black border border-gray-800 rounded-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <h2 className="text-lg font-bold">{isSetupMode ? "Complete Your Profile" : "Edit Profile"}</h2>
                    {!isSetupMode && (
                        <button onClick={onClose} className="text-gray-400 hover:text-white">
                            <X size={24} />
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Profile Picture */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative group cursor-pointer">
                            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-800">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-500">
                                        {formData.username?.[0]?.toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                                <Camera className="text-white" size={24} />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                            </label>
                        </div>
                        <span className="text-blue-500 text-sm font-bold cursor-pointer">Change Profile Photo</span>
                    </div>

                    {/* Fields */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                            <input
                                type="text"
                                value={formData.displayName}
                                onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-gray-600"
                                placeholder="Display Name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-gray-600"
                                placeholder="Username"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Bio</label>
                            <textarea
                                value={formData.bio}
                                onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-gray-600 min-h-[80px]"
                                placeholder="Write something about yourself..."
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-500 text-white font-bold py-2 rounded hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : "Save"}
                    </button>
                </form>
            </div>
        </div>
    );
}
