import { useState } from "react";
import { Image, Music } from "lucide-react";

export default function UploadSong() {
  const [coverImage, setCoverImage] = useState(null);
  const [audioFile, setAudioFile] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log({
      coverImage,
      audioFile,
    });

    alert("Song uploaded successfully!");
  };

  return (
    <div className="min-h-screen bg-black text-white flex justify-center px-6 py-10">

      <div className="w-full max-w-4xl flex flex-col items-center">

        {/* TITLE */}
        <h1 className="text-6xl font-bold mb-2 text-center">
          Upload Song
        </h1>

        <p className="text-gray-400 text-xl mb-10 text-center">
          Share your music with the community
        </p>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#111] border border-[#222] rounded-3xl p-8 w-full"
        >

          {/* UPLOAD BOX */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

            {/* COVER */}
            <label className="border-2 border-dashed border-[#2a2a2a] rounded-3xl h-[220px] flex flex-col items-center justify-center cursor-pointer hover:border-cyan-400 transition">

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setCoverImage(e.target.files[0])}
              />

              <Image size={60} className="text-cyan-400 mb-4" />

              <h2 className="text-3xl font-bold mb-2">
                Upload Cover
              </h2>

              <p className="text-gray-400">
                PNG, JPG
              </p>

              {coverImage && (
                <p className="text-cyan-400 mt-3 text-sm">
                  {coverImage.name}
                </p>
              )}
            </label>

            {/* AUDIO */}
            <label className="border-2 border-dashed border-[#2a2a2a] rounded-3xl h-[220px] flex flex-col items-center justify-center cursor-pointer hover:border-cyan-400 transition">

              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => setAudioFile(e.target.files[0])}
              />

              <Music size={60} className="text-cyan-400 mb-4" />

              <h2 className="text-3xl font-bold mb-2">
                Upload Audio
              </h2>

              <p className="text-gray-400">
                MP3, WAV
              </p>

              {audioFile && (
                <p className="text-cyan-400 mt-3 text-sm">
                  {audioFile.name}
                </p>
              )}
            </label>
          </div>

          {/* SONG TITLE */}
          <div className="mb-6">
            <label className="block mb-2 text-lg font-semibold">
              Song Title
            </label>

            <input
              type="text"
              placeholder="Enter song title"
              className="w-full bg-[#181818] border border-[#2a2a2a] rounded-2xl px-5 py-4 text-lg outline-none focus:border-cyan-400"
            />
          </div>

          {/* ARTIST */}
          <div className="mb-6">
            <label className="block mb-2 text-lg font-semibold">
              Artist Name
            </label>

            <input
              type="text"
              placeholder="Enter artist name"
              className="w-full bg-[#181818] border border-[#2a2a2a] rounded-2xl px-5 py-4 text-lg outline-none focus:border-cyan-400"
            />
          </div>

          {/* GENRE */}
          <div className="mb-6">
            <label className="block mb-2 text-lg font-semibold">
              Genre
            </label>

            <select
              className="w-full bg-[#181818] border border-[#2a2a2a] rounded-2xl px-5 py-4 text-lg outline-none focus:border-cyan-400"
            >
              <option>Select genre</option>
              <option>Pop</option>
              <option>Rock</option>
              <option>Hip Hop</option>
              <option>Lo-fi</option>
              <option>EDM</option>
            </select>
          </div>

          {/* DESCRIPTION */}
          <div className="mb-8">
            <label className="block mb-2 text-lg font-semibold">
              Description
            </label>

            <textarea
              rows="5"
              placeholder="Write something about your song..."
              className="w-full bg-[#181818] border border-[#2a2a2a] rounded-2xl px-5 py-4 text-lg outline-none focus:border-cyan-400 resize-none"
            />
          </div>

          {/* BUTTON */}
          <button
            type="submit"
  className="ml-auto mr-2 flex items-center justify-center gap-3 bg-[#00E5FF] hover:bg-[#00d0e8] text-black font-bold text-2xl px-12 py-5 rounded-full transition duration-300"
>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="w-7 h-7"
            >
                <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16V4m0 0l-4 4m4-4l4 4M4 16.5v1.125C4 19.489 5.511 21 7.375 21h9.25C18.489 21 20 19.489 20 17.625V16.5"
                />
            </svg>

  Upload Song
</button>

        </form>

      </div>

    </div>
  );
}