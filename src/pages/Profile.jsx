import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
    doc,
    getDoc,
    collection,
    query,
    where,
    orderBy,
    getDocs,
    updateDoc,
    arrayUnion,
    arrayRemove,
    addDoc,
    serverTimestamp
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { Loader2, Settings } from "lucide-react";
import EditProfileModal from "../components/EditProfileModal";

export default function Profile() {
    const { uid } = useParams();
    const { user: currentUser } = useAuth();
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    useEffect(() => {
        async function fetchProfile() {
            try {
                // Fetch user profile
                const userDoc = await getDoc(doc(db, "users", uid));
                if (userDoc.exists()) {
                    setProfile(userDoc.data());
                    setIsFollowing(userDoc.data().followers?.includes(currentUser?.uid));
                }

                // Fetch user posts
                // Fetch user posts
                const q = query(
                    collection(db, "posts"),
                    where("userId", "==", uid)
                );
                const postsSnapshot = await getDocs(q);
                const postsData = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Sort client-side to avoid composite index requirement
                postsData.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
                setPosts(postsData);
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setLoading(false);
            }
        }

        if (uid) {
            fetchProfile();
        }

        // Check for setup param
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get("setup") === "true" && currentUser?.uid === uid) {
            setIsEditModalOpen(true);
        }
    }, [uid, currentUser]);

    const handleFollow = async () => {
        if (!currentUser) return;

        const userRef = doc(db, "users", uid);
        const currentUserRef = doc(db, "users", currentUser.uid);

        if (isFollowing) {
            await updateDoc(userRef, { followers: arrayRemove(currentUser.uid) });
            await updateDoc(currentUserRef, { following: arrayRemove(uid) });
            setIsFollowing(false);
            setProfile(prev => ({ ...prev, followers: prev.followers.filter(id => id !== currentUser.uid) }));
        } else {
            await updateDoc(userRef, { followers: arrayUnion(currentUser.uid) });
            await updateDoc(currentUserRef, { following: arrayUnion(uid) });
            setIsFollowing(true);
            setProfile(prev => ({ ...prev, followers: [...(prev.followers || []), currentUser.uid] }));

            // Create Notification
            if (currentUser.uid !== uid) {
                await addDoc(collection(db, "notifications"), {
                    recipientId: uid,
                    senderId: currentUser.uid,
                    type: "follow",
                    message: `${currentUser.displayName || currentUser.username} started following you`,
                    createdAt: serverTimestamp(),
                    read: false,
                    sender: {
                        username: currentUser.username,
                        photoURL: currentUser.photoURL
                    }
                });
            }
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="animate-spin text-white" size={48} />
            </div>
        );
    }

    if (!profile) {
        return <div className="text-center mt-10">User not found</div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
                <div className="w-32 h-32 md:w-40 md:h-40 bg-gray-800 rounded-full overflow-hidden flex-shrink-0">
                    {profile.photoURL ? (
                        <img src={profile.photoURL} alt={profile.username} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-500">
                            {profile.username?.[0]?.toUpperCase()}
                        </div>
                    )}
                </div>

                <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                        <h1 className="text-2xl font-light">{profile.username}</h1>
                        {currentUser?.uid === uid ? (
                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                className="px-4 py-1.5 bg-gray-800 rounded font-bold text-sm hover:bg-gray-700"
                            >
                                Edit Profile
                            </button>
                        ) : (
                            <button
                                onClick={handleFollow}
                                className={`px-6 py-1.5 rounded font-bold text-sm transition-colors ${isFollowing ? "bg-gray-800 text-white" : "bg-blue-500 text-white hover:bg-blue-600"
                                    }`}
                            >
                                {isFollowing ? "Following" : "Follow"}
                            </button>
                        )}
                        {currentUser?.uid === uid && <Settings className="cursor-pointer" />}
                    </div>

                    <div className="flex justify-center md:justify-start gap-8 mb-4">
                        <span><span className="font-bold">{posts.length}</span> posts</span>
                        <span><span className="font-bold">{profile.followers?.length || 0}</span> followers</span>
                        <span><span className="font-bold">{profile.following?.length || 0}</span> following</span>
                    </div>

                    <div>
                        <div className="font-bold">{profile.displayName}</div>
                        <div className="whitespace-pre-wrap">{profile.bio}</div>
                    </div>
                </div>
            </div>

            {/* Posts Grid */}
            <div className="border-t border-gray-800 pt-8">
                <div className="grid grid-cols-3 gap-1 md:gap-8">
                    {posts.map(post => (
                        <div key={post.id} className="aspect-square bg-gray-900 group relative cursor-pointer">
                            <img src={post.imageUrl} alt="Post" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white font-bold">
                                <span>❤️ {post.likes?.length || 0}</span>
                            </div>
                        </div>
                    ))}
                </div>
                {posts.length === 0 && (
                    <div className="text-center text-gray-500 py-10">
                        <div className="text-4xl mb-4">📷</div>
                        <p>No posts yet</p>
                    </div>
                )}
            </div>

            <EditProfileModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    // Prevent closing if in setup mode
                    const searchParams = new URLSearchParams(window.location.search);
                    if (searchParams.get("setup") !== "true") {
                        setIsEditModalOpen(false);
                    }
                }}
                currentUser={currentUser}
                profileData={profile}
                onUpdate={(updates) => setProfile(prev => ({ ...prev, ...updates }))}
                isSetupMode={new URLSearchParams(window.location.search).get("setup") === "true"}
            />
        </div>
    );
}
