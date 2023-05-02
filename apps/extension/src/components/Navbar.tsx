import logoImage from "data-base64:~assets/android-chrome-192x192.png";
import arbitrumLogo from "data-base64:~assets/arbitrum-logo.png";
import polygonLogo from "data-base64:~assets/polygon-logo.png";
import ethereumLogo from "data-base64:~assets/ethereum-logo.png";
import bnbLogo from "data-base64:~assets/bnb-logo.png";

export default function Navbar({ chainId }: { chainId?: string }) {
  const chainComponent = () => {
    switch (chainId?.toLowerCase()) {
      case "0x1":
        return <img className="my-auto block h-9 w-auto" src={ethereumLogo} alt="Ethereum Logo" />;
      case "0x89":
        return <img className="my-auto block h-9 w-auto" src={polygonLogo} alt="Polygon Logo" />;
      case "0xa4b1":
        return (
          <img className="my-auto ml-1 block h-9 w-auto" src={arbitrumLogo} alt="Arbitrum Logo" />
        );
      case "0x38":
        return (
          <img className="my-auto ml-1 block h-9 w-auto" src={bnbLogo} alt="BNB Logo" />
        );

      default:
        return null;
    }
  };
  return (
    <div className="flex h-20 w-full grow items-center gap-4 border-b border-b-2 border-gray-800 bg-gray-900 p-2 px-4">
      <img className="my-auto block h-12 w-12 w-auto" src={logoImage} alt="Pocket Universe Logo" />
      <div className="text-primary-300 my-auto flex grow text-base text-xl">Pocket Universe</div>
      {chainComponent()}
    </div>
  );
}
