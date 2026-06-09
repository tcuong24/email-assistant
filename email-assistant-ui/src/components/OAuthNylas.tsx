import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code');

  useEffect(() => {
    if (code) {
      // Gửi mã code lên backend Gateway để đổi lấy Grant ID và lưu lại
      api.post('/emails/nylas/connect', { code })
        .then(() => {
          alert('Kết nối hòm thư thành công!');
          navigate('/dashboard');
        })
        .catch(err => {
          console.error(err);
          const errorMsg = err.response?.data?.message || 'Kết nối hòm thư thất bại. Vui lòng kiểm tra lại quyền truy cập!';
          alert(errorMsg);
          navigate('/dashboard');
        });
    }
  }, [code]);

  return <div>Đang hoàn tất kết nối hộp thư...</div>;
}
