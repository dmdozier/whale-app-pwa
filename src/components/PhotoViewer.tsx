interface PhotoViewerProps {
  src: string
  onClose: () => void
}

export function PhotoViewer({ src, onClose }: PhotoViewerProps) {
  return (
    <div className="photo-viewer" onClick={onClose}>
      <img src={src} alt="" />
    </div>
  )
}
