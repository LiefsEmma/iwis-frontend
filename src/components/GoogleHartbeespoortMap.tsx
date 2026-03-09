interface GoogleHartbeespoortMapProps {
  title?: string;
}

const MAP_CENTER = "-25.7343,27.8587";

export default function GoogleHartbeespoortMap({
  title = "Hartbeespoort Dam map",
}: GoogleHartbeespoortMapProps) {
  const mapUrl = `https://www.google.com/maps?q=${MAP_CENTER}&z=12&output=embed`;

  return (
    <div className="google-map-wrap">
      <iframe
        title={title}
        className="google-map-frame"
        src={mapUrl}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
