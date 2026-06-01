import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code');

  useEffect(() => {
    if (code) {
      // Gửi mã code lên backend Gateway để đổi lấy Grant ID và lưu lại
      axios.post('/api/v1/emails/nylas/connect', { code })
        .then(() => {
          alert('Kết nối hòm thư thành công!');
          navigate('/dashboard');
        })
        .catch(err => {
          console.error(err);
          alert('Kết nối thất bại');
        });
    }
  }, [code]);

  return <div>Đang hoàn tất kết nối hộp thư...</div>;
}
