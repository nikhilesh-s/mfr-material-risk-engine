import type { FormEvent } from 'react';

type Props = {
  onSubmit: (file: File) => void;
  loading?: boolean;
};

function DatasetUploadForm({ onSubmit, loading = false }: Props) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get('dataset_file');
    if (file instanceof File) {
      onSubmit(file);
    }
  };

  return (
    <form onSubmit={submit} className="dravix-card rounded-[1.75rem] p-5">
      <div className="text-lg font-light text-[var(--dravix-ink)]">Upload dataset</div>
      <p className="mt-2 text-sm text-[var(--dravix-ink-soft)]">CSV files are validated server-side and persisted into the dataset layer.</p>
      <input type="file" name="dataset_file" accept=".csv" className="mt-4 block w-full rounded-xl border border-[#762123]/10 bg-[#f8f8f8] px-4 py-3 text-sm" />
      <button type="submit" disabled={loading} className="mt-4 rounded-full bg-gradient-to-r from-[#784F74] to-[#E8967F] px-4 py-2 text-sm text-white disabled:opacity-60">
        {loading ? 'Uploading…' : 'Upload dataset'}
      </button>
    </form>
  );
}

export default DatasetUploadForm;
