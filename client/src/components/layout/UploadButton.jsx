import { Link } from "react-router-dom";

export default function UploadButton() {
  return (
    <Link to="/upload-song">
      <button className="text-text text-[42px] leading-none hover:scale-110 transition duration-200">
        +
      </button>
    </Link>
  );
}