'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import LoginPage from './LoginPage';
import PlatformSelection from './PlatformSelection';
import VideoDetails from './VideoDetails';
import ResultsPage from './ResultsPage';

export default function Wrapper() {
  const { data: session, status } = useSession();
  const [step, setStep] = useState('login');
  const [platform, setPlatform] = useState(null);
  const [videoDetails, setVideoDetails] = useState(null);

  useEffect(() => {
    if (status === 'authenticated') {
      setStep('platform');
    } else if (status === 'unauthenticated') {
      setStep('login');
    }
  }, [status]);

  if (status === 'loading') {
    return null; 
  }

  if (step === 'login') {
    return <LoginPage />;
  }

  if (step === 'platform') {
    return (
      <PlatformSelection
        onSelect={(selectedPlatform) => {
          setPlatform(selectedPlatform);
          setStep('details');
        }}
      />
    );
  }

  if (step === 'details') {
    return (
      <VideoDetails
        platform={platform}
        onNext={(details) => {
          setVideoDetails(details);
          setStep('results');
        }}
      />
    );
  }

  if (step === 'results') {
    return <ResultsPage payload={videoDetails} />;
  }

  return <LoginPage />;
}
