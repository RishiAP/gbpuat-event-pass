"use client";
import { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRCodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: string) => void;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScanSuccess, onScanFailure }) => {
  useEffect(() => {
    const config = {
      fps: 10, // Frames per second for the scan
      qrbox: { width: 250, height: 250 }, // QR code scanning box
    };

    const scanner = new Html5QrcodeScanner('qr-reader', config, false);

    scanner.render(
      (decodedText: string) => {
        // Successfully scanned
        onScanSuccess(decodedText);
      },
      (error: string) => {
        // Handle scan failure, optional
        if (onScanFailure) {
          onScanFailure(error);
        }
      }
    );

    // Cleanup on component unmount
    return () => {
      scanner.clear();
    };
  }, [onScanSuccess, onScanFailure]);

  return <div id="qr-reader" className='w-full max-w-2xl m-auto' />;
};

export default QRCodeScanner;
