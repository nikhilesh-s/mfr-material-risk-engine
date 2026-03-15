import { useEffect, useState } from 'react';
import MaterialScreening from '../components/MaterialScreening';
import { ApiError, getMaterials } from '../lib/api';

function ScreeningPage() {
  const [materials, setMaterials] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await getMaterials();
        setMaterials(response.materials ?? []);
        setErrorMessage(null);
      } catch (error) {
        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else if (error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage('Material lookup is unavailable.');
        }
        setMaterials([]);
      }
    })();
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      {errorMessage ? (
        <div className="mb-4 px-4 py-3 rounded-xl bg-[#FFF2D8] text-[#6B4E00] text-sm">
          {errorMessage}
        </div>
      ) : null}
      <MaterialScreening materials={materials} />
    </div>
  );
}

export default ScreeningPage;
