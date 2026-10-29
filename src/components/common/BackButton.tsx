import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';

export default function BackButton({ fallback = '/products' }: { fallback?: string }) {
  const navigate = useNavigate();
  return <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => {
    if (typeof window.history.state?.idx === 'number' && window.history.state.idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  }}>Quay lại</Button>;
}
