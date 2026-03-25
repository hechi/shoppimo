import { useClipboard } from '../hooks/useClipboard';
import { useI18n } from '../context/I18nContext';

interface ShareButtonProps {
  listId: string;
}

const ShareButton = ({ listId }: ShareButtonProps) => {
  const { copied, copyToClipboard } = useClipboard();
  const { t } = useI18n();

  const handleCopy = async () => {
    const url = `${window.location.origin}/list/${listId}`;
    const success = await copyToClipboard(url);
    if (!success) {
      // Fallback for browsers that don't support clipboard API
      try {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (error) {
        console.error('Failed to copy URL:', error);
      }
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`px-3 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
        copied 
          ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' 
          : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white'
      }`}
    >
      {copied ? (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
{t('messages.linkCopied')}
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
{t('buttons.share')}
        </>
      )}
    </button>
  );
};

export default ShareButton;