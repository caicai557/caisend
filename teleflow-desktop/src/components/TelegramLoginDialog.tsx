import { useState, useEffect, useRef } from 'react'
import { Button } from './ui/button'

interface TelegramLoginDialogProps {
  show: boolean
  account: string
  qrCode?: string  // Base64 或 URL 格式的 QR 码
  onClose: () => void
  onSuccess?: () => void
}

// 完整的国家代码列表（前100个最常用）
const COUNTRIES = [
  { code: '+1', name: 'United States', flag: '🇺🇸', id: 'us' },
  { code: '+1', name: 'Canada', flag: '🇨🇦', id: 'ca' },
  { code: '+7', name: 'Russia', flag: '🇷🇺' },
  { code: '+20', name: 'Egypt', flag: '🇪🇬' },
  { code: '+27', name: 'South Africa', flag: '🇿🇦' },
  { code: '+30', name: 'Greece', flag: '🇬🇷' },
  { code: '+31', name: 'Netherlands', flag: '🇳🇱' },
  { code: '+32', name: 'Belgium', flag: '🇧🇪' },
  { code: '+33', name: 'France', flag: '🇫🇷' },
  { code: '+34', name: 'Spain', flag: '🇪🇸' },
  { code: '+36', name: 'Hungary', flag: '🇭🇺' },
  { code: '+39', name: 'Italy', flag: '🇮🇹' },
  { code: '+40', name: 'Romania', flag: '🇷🇴' },
  { code: '+41', name: 'Switzerland', flag: '🇨🇭' },
  { code: '+43', name: 'Austria', flag: '🇦🇹' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+45', name: 'Denmark', flag: '🇩🇰' },
  { code: '+46', name: 'Sweden', flag: '🇸🇪' },
  { code: '+47', name: 'Norway', flag: '🇳🇴' },
  { code: '+48', name: 'Poland', flag: '🇵🇱' },
  { code: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: '+51', name: 'Peru', flag: '🇵🇪' },
  { code: '+52', name: 'Mexico', flag: '🇲🇽' },
  { code: '+53', name: 'Cuba', flag: '🇨🇺' },
  { code: '+54', name: 'Argentina', flag: '🇦🇷' },
  { code: '+55', name: 'Brazil', flag: '🇧🇷' },
  { code: '+56', name: 'Chile', flag: '🇨🇱' },
  { code: '+57', name: 'Colombia', flag: '🇨🇴' },
  { code: '+58', name: 'Venezuela', flag: '🇻🇪' },
  { code: '+60', name: 'Malaysia', flag: '🇲🇾' },
  { code: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: '+62', name: 'Indonesia', flag: '🇮🇩' },
  { code: '+63', name: 'Philippines', flag: '🇵🇭' },
  { code: '+64', name: 'New Zealand', flag: '🇳🇿' },
  { code: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: '+66', name: 'Thailand', flag: '🇹🇭' },
  { code: '+81', name: 'Japan', flag: '🇯🇵' },
  { code: '+82', name: 'South Korea', flag: '🇰🇷' },
  { code: '+84', name: 'Vietnam', flag: '🇻🇳' },
  { code: '+86', name: 'China', flag: '🇨🇳' },
  { code: '+90', name: 'Turkey', flag: '🇹🇷' },
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+92', name: 'Pakistan', flag: '🇵🇰' },
  { code: '+93', name: 'Afghanistan', flag: '🇦🇫' },
  { code: '+94', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+95', name: 'Myanmar', flag: '🇲🇲' },
  { code: '+98', name: 'Iran', flag: '🇮🇷' },
  { code: '+212', name: 'Morocco', flag: '🇲🇦' },
  { code: '+213', name: 'Algeria', flag: '🇩🇿' },
  { code: '+216', name: 'Tunisia', flag: '🇹🇳' },
  { code: '+218', name: 'Libya', flag: '🇱🇾' },
  { code: '+220', name: 'Gambia', flag: '🇬🇲' },
  { code: '+221', name: 'Senegal', flag: '🇸🇳' },
  { code: '+222', name: 'Mauritania', flag: '🇲🇷' },
  { code: '+223', name: 'Mali', flag: '🇲🇱' },
  { code: '+224', name: 'Guinea', flag: '🇬🇳' },
  { code: '+225', name: "Côte d'Ivoire", flag: '🇨🇮' },
  { code: '+226', name: 'Burkina Faso', flag: '🇧🇫' },
  { code: '+227', name: 'Niger', flag: '🇳🇪' },
  { code: '+228', name: 'Togo', flag: '🇹🇬' },
  { code: '+229', name: 'Benin', flag: '🇧🇯' },
  { code: '+230', name: 'Mauritius', flag: '🇲🇺' },
  { code: '+231', name: 'Liberia', flag: '🇱🇷' },
  { code: '+232', name: 'Sierra Leone', flag: '🇸🇱' },
  { code: '+233', name: 'Ghana', flag: '🇬🇭' },
  { code: '+234', name: 'Nigeria', flag: '🇳🇬' },
  { code: '+235', name: 'Chad', flag: '🇹🇩' },
  { code: '+236', name: 'Central African Republic', flag: '🇨🇫' },
  { code: '+237', name: 'Cameroon', flag: '🇨🇲' },
  { code: '+238', name: 'Cape Verde', flag: '🇨🇻' },
  { code: '+239', name: 'São Tomé and Príncipe', flag: '🇸🇹' },
  { code: '+240', name: 'Equatorial Guinea', flag: '🇬🇶' },
  { code: '+241', name: 'Gabon', flag: '🇬🇦' },
  { code: '+242', name: 'Republic of the Congo', flag: '🇨🇬' },
  { code: '+243', name: 'Democratic Republic of the Congo', flag: '🇨🇩' },
  { code: '+244', name: 'Angola', flag: '🇦🇴' },
  { code: '+245', name: 'Guinea-Bissau', flag: '🇬🇼' },
  { code: '+246', name: 'British Indian Ocean Territory', flag: '🇮🇴' },
  { code: '+248', name: 'Seychelles', flag: '🇸🇨' },
  { code: '+249', name: 'Sudan', flag: '🇸🇩' },
  { code: '+250', name: 'Rwanda', flag: '🇷🇼' },
  { code: '+251', name: 'Ethiopia', flag: '🇪🇹' },
  { code: '+252', name: 'Somalia', flag: '🇸🇴' },
  { code: '+253', name: 'Djibouti', flag: '🇩🇯' },
  { code: '+254', name: 'Kenya', flag: '🇰🇪' },
  { code: '+255', name: 'Tanzania', flag: '🇹🇿' },
  { code: '+256', name: 'Uganda', flag: '🇺🇬' },
  { code: '+257', name: 'Burundi', flag: '🇧🇮' },
  { code: '+258', name: 'Mozambique', flag: '🇲🇿' },
  { code: '+260', name: 'Zambia', flag: '🇿🇲' },
  { code: '+261', name: 'Madagascar', flag: '🇲🇬' },
  { code: '+262', name: 'Réunion', flag: '🇷🇪' },
  { code: '+263', name: 'Zimbabwe', flag: '🇿🇼' },
  { code: '+264', name: 'Namibia', flag: '🇳🇦' },
  { code: '+265', name: 'Malawi', flag: '🇲🇼' },
  { code: '+266', name: 'Lesotho', flag: '🇱🇸' },
  { code: '+267', name: 'Botswana', flag: '🇧🇼' },
  { code: '+268', name: 'Eswatini', flag: '🇸🇿' },
  { code: '+269', name: 'Comoros', flag: '🇰🇲' },
  { code: '+350', name: 'Gibraltar', flag: '🇬🇮' },
  { code: '+351', name: 'Portugal', flag: '🇵🇹' },
  { code: '+352', name: 'Luxembourg', flag: '🇱🇺' },
  { code: '+353', name: 'Ireland', flag: '🇮🇪' },
  { code: '+354', name: 'Iceland', flag: '🇮🇸' },
  { code: '+355', name: 'Albania', flag: '🇦🇱' },
  { code: '+356', name: 'Malta', flag: '🇲🇹' },
  { code: '+357', name: 'Cyprus', flag: '🇨🇾' },
  { code: '+358', name: 'Finland', flag: '🇫🇮' },
  { code: '+359', name: 'Bulgaria', flag: '🇧🇬' },
  { code: '+370', name: 'Lithuania', flag: '🇱🇹' },
  { code: '+371', name: 'Latvia', flag: '🇱🇻' },
  { code: '+372', name: 'Estonia', flag: '🇪🇪' },
  { code: '+373', name: 'Moldova', flag: '🇲🇩' },
  { code: '+374', name: 'Armenia', flag: '🇦🇲' },
  { code: '+375', name: 'Belarus', flag: '🇧🇾' },
  { code: '+376', name: 'Andorra', flag: '🇦🇩' },
  { code: '+377', name: 'Monaco', flag: '🇲🇨' },
  { code: '+378', name: 'San Marino', flag: '🇸🇲' },
  { code: '+380', name: 'Ukraine', flag: '🇺🇦' },
  { code: '+381', name: 'Serbia', flag: '🇷🇸' },
  { code: '+382', name: 'Montenegro', flag: '🇲🇪' },
  { code: '+383', name: 'Kosovo', flag: '🇽🇰' },
  { code: '+385', name: 'Croatia', flag: '🇭🇷' },
  { code: '+386', name: 'Slovenia', flag: '🇸🇮' },
  { code: '+387', name: 'Bosnia and Herzegovina', flag: '🇧🇦' },
  { code: '+389', name: 'North Macedonia', flag: '🇲🇰' },
  { code: '+420', name: 'Czech Republic', flag: '🇨🇿' },
  { code: '+421', name: 'Slovakia', flag: '🇸🇰' },
  { code: '+423', name: 'Liechtenstein', flag: '🇱🇮' },
  { code: '+500', name: 'Falkland Islands', flag: '🇫🇰' },
  { code: '+501', name: 'Belize', flag: '🇧🇿' },
  { code: '+502', name: 'Guatemala', flag: '🇬🇹' },
  { code: '+503', name: 'El Salvador', flag: '🇸🇻' },
  { code: '+504', name: 'Honduras', flag: '🇭🇳' },
  { code: '+505', name: 'Nicaragua', flag: '🇳🇮' },
  { code: '+506', name: 'Costa Rica', flag: '🇨🇷' },
  { code: '+507', name: 'Panama', flag: '🇵🇦' },
  { code: '+509', name: 'Haiti', flag: '🇭🇹' },
  { code: '+591', name: 'Bolivia', flag: '🇧🇴' },
  { code: '+592', name: 'Guyana', flag: '🇬🇾' },
  { code: '+593', name: 'Ecuador', flag: '🇪🇨' },
  { code: '+594', name: 'French Guiana', flag: '🇬🇫' },
  { code: '+595', name: 'Paraguay', flag: '🇵🇾' },
  { code: '+596', name: 'Martinique', flag: '🇲🇶' },
  { code: '+597', name: 'Suriname', flag: '🇸🇷' },
  { code: '+598', name: 'Uruguay', flag: '🇺🇾' },
  { code: '+599', name: 'Caribbean Netherlands', flag: '🇧🇶' },
  { code: '+670', name: 'East Timor', flag: '🇹🇱' },
  { code: '+672', name: 'Antarctica', flag: '🇦🇶' },
  { code: '+673', name: 'Brunei', flag: '🇧🇳' },
  { code: '+674', name: 'Nauru', flag: '🇳🇷' },
  { code: '+675', name: 'Papua New Guinea', flag: '🇵🇬' },
  { code: '+676', name: 'Tonga', flag: '🇹🇴' },
  { code: '+677', name: 'Solomon Islands', flag: '🇸🇧' },
  { code: '+678', name: 'Vanuatu', flag: '🇻🇺' },
  { code: '+679', name: 'Fiji', flag: '🇫🇯' },
  { code: '+680', name: 'Palau', flag: '🇵🇼' },
  { code: '+681', name: 'Wallis and Futuna', flag: '🇼🇫' },
  { code: '+682', name: 'Cook Islands', flag: '🇨🇰' },
  { code: '+683', name: 'Niue', flag: '🇳🇺' },
  { code: '+685', name: 'Samoa', flag: '🇼🇸' },
  { code: '+686', name: 'Kiribati', flag: '🇰🇮' },
  { code: '+687', name: 'New Caledonia', flag: '🇳🇨' },
  { code: '+688', name: 'Tuvalu', flag: '🇹🇻' },
  { code: '+689', name: 'French Polynesia', flag: '🇵🇫' },
  { code: '+690', name: 'Tokelau', flag: '🇹🇰' },
  { code: '+691', name: 'Micronesia', flag: '🇫🇲' },
  { code: '+692', name: 'Marshall Islands', flag: '🇲🇭' },
  { code: '+850', name: 'North Korea', flag: '🇰🇵' },
  { code: '+852', name: 'Hong Kong', flag: '🇭🇰' },
  { code: '+853', name: 'Macau', flag: '🇲🇴' },
  { code: '+855', name: 'Cambodia', flag: '🇰🇭' },
  { code: '+856', name: 'Laos', flag: '🇱🇦' },
  { code: '+880', name: 'Bangladesh', flag: '🇧🇩' },
  { code: '+886', name: 'Taiwan', flag: '🇹🇼' },
  { code: '+960', name: 'Maldives', flag: '🇲🇻' },
  { code: '+961', name: 'Lebanon', flag: '🇱🇧' },
  { code: '+962', name: 'Jordan', flag: '🇯🇴' },
  { code: '+963', name: 'Syria', flag: '🇸🇾' },
  { code: '+964', name: 'Iraq', flag: '🇮🇶' },
  { code: '+965', name: 'Kuwait', flag: '🇰🇼' },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+967', name: 'Yemen', flag: '🇾🇪' },
  { code: '+968', name: 'Oman', flag: '🇴🇲' },
  { code: '+970', name: 'Palestine', flag: '🇵🇸' },
  { code: '+971', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: '+972', name: 'Israel', flag: '🇮🇱' },
  { code: '+973', name: 'Bahrain', flag: '🇧🇭' },
  { code: '+974', name: 'Qatar', flag: '🇶🇦' },
  { code: '+975', name: 'Bhutan', flag: '🇧🇹' },
  { code: '+976', name: 'Mongolia', flag: '🇲🇳' },
  { code: '+977', name: 'Nepal', flag: '🇳🇵' },
  { code: '+992', name: 'Tajikistan', flag: '🇹🇯' },
  { code: '+993', name: 'Turkmenistan', flag: '🇹🇲' },
  { code: '+994', name: 'Azerbaijan', flag: '🇦🇿' },
  { code: '+995', name: 'Georgia', flag: '🇬🇪' },
  { code: '+996', name: 'Kyrgyzstan', flag: '🇰🇬' },
  { code: '+998', name: 'Uzbekistan', flag: '🇺🇿' },
]

export default function TelegramLoginDialog({ show, account, qrCode, onClose, onSuccess }: TelegramLoginDialogProps) {
  const [loginMethod, setLoginMethod] = useState<'qr' | 'phone'>('qr')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [countryCode, setCountryCode] = useState('+86')
  const [verificationCode, setVerificationCode] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState<'phone' | 'code' | 'password'>('phone')
  const [countrySearchQuery, setCountrySearchQuery] = useState('')
  const [isCountryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const phoneInputRef = useRef<HTMLInputElement>(null)

  // 智能检测并同步国家代码
  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value)
    
    // 如果输入以 + 开头，尝试匹配国家代码
    if (value.startsWith('+')) {
      const inputCode = value.match(/^\+\d+/)?.[0] || ''
      
      // 查找匹配的国家代码
      const matchedCountry = COUNTRIES.find(c => 
        value.startsWith(c.code + ' ') || value === c.code
      )
      
      if (matchedCountry && matchedCountry.code !== countryCode) {
        setCountryCode(matchedCountry.code)
        // 移除国家代码，只保留号码
        if (value.startsWith(matchedCountry.code + ' ')) {
          setPhoneNumber(value.substring(matchedCountry.code.length + 1))
        }
      } else if (inputCode && inputCode.length >= 2) {
        // 部分匹配的国家代码
        const partialMatch = COUNTRIES.find(c => c.code.startsWith(inputCode))
        if (partialMatch && partialMatch.code !== countryCode) {
          setCountryCode(partialMatch.code)
        }
      }
    }
  }
  
  // 过滤国家列表
  const filteredCountries = COUNTRIES.filter(country => 
    country.name.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
    country.code.includes(countrySearchQuery)
  )

  useEffect(() => {
    if (!show) {
      setCountryDropdownOpen(false)
      return
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setCountryDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [show])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* 头部 */}
        <div className="relative bg-gradient-to-b from-[#5288c1] to-[#4682b4] text-white p-6 pb-20">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-1">
              {loginMethod === 'qr' ? 'Log in to Telegram' : 'Sign in'}
            </h2>
            <p className="text-white/80 text-sm">
              {loginMethod === 'qr' 
                ? 'Please confirm login on your other device'
                : 'Please enter your phone number'}
            </p>
          </div>
        </div>

        {/* 主内容 */}
        <div className="bg-white dark:bg-gray-900 -mt-12 rounded-t-3xl relative z-10 px-6 py-8">
          {loginMethod === 'qr' ? (
            // QR 码登录
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-lg flex items-center justify-center min-h-[320px]">
                {qrCode ? (
                  <div className="text-center">
                    <img 
                      src={qrCode} 
                      alt="Telegram Login QR Code"
                      className="w-64 h-64 mx-auto rounded-xl shadow-md"
                    />
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                      为账号 <strong>{account}</strong> 扫描二维码
                    </p>
                  </div>
                ) : (
                  <div className="text-center space-y-3">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-500 mx-auto"></div>
                    <p className="text-gray-600 dark:text-gray-400">正在生成二维码...</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      请确保后端已启动并监听 QR 码事件
                    </p>
                  </div>
                )}
              </div>
              
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                  <span>使用手机扫描二维码</span>
                </div>
                
                <ol className="text-xs text-gray-500 dark:text-gray-500 space-y-1 text-left max-w-xs mx-auto">
                  <li className="flex">
                    <span className="mr-2">1.</span>
                    <span>Open Telegram on your phone</span>
                  </li>
                  <li className="flex">
                    <span className="mr-2">2.</span>
                    <span>Go to <strong>Settings</strong> → <strong>Devices</strong> → <strong>Link Desktop Device</strong></span>
                  </li>
                  <li className="flex">
                    <span className="mr-2">3.</span>
                    <span>Point your phone at this screen to confirm login</span>
                  </li>
                </ol>

                <button
                  onClick={() => setLoginMethod('phone')}
                  className="text-[#4682b4] hover:text-[#3a6fa0] font-medium text-sm mt-4"
                >
                  Log in by phone Number
                </button>
              </div>
            </div>
          ) : (
            // 手机号登录
            <div className="space-y-4">
              {step === 'phone' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Country
                    </label>
                    <div className="relative" ref={dropdownRef}>
                      <button
                        type="button"
                        onClick={() => setCountryDropdownOpen((open) => !open)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:border-[#4682b4] focus:ring-2 focus:ring-[#4682b4] focus:border-transparent outline-none transition-colors"
                      >
                        <span className="flex items-center">
                          <span className="text-2xl mr-2">{COUNTRIES.find((country) => country.code === countryCode)?.flag}</span>
                          <span className="font-medium">{COUNTRIES.find((country) => country.code === countryCode)?.name || 'Select country'}</span>
                          <span className="ml-2 text-gray-500">({countryCode})</span>
                        </span>
                        <span className={`transition-transform text-gray-400 ${isCountryDropdownOpen ? 'rotate-180' : ''}`}>
                          ▼
                        </span>
                      </button>
                      {isCountryDropdownOpen && (
                        <div className="absolute z-20 mt-2 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl">
                          {/* 搜索框 */}
                          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                            <input
                              type="text"
                              placeholder="🔍 Search country..."
                              value={countrySearchQuery}
                              onChange={(e) => setCountrySearchQuery(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#4682b4] focus:border-transparent outline-none text-sm"
                              autoFocus
                            />
                          </div>
                          {/* 国家列表 */}
                          <div className="max-h-56 overflow-y-auto">
                            {filteredCountries.length === 0 ? (
                              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">No results</div>
                            ) : (
                              <ul className="py-1">
                                {filteredCountries.map((country, index) => (
                                  <li key={`${country.code}-${country.name}-${index}`}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCountryCode(country.code)
                                        setCountrySearchQuery('')
                                        setCountryDropdownOpen(false)
                                        // 自动聚焦到手机号输入框
                                        setTimeout(() => phoneInputRef.current?.focus(), 100)
                                      }}
                                      className={`w-full text-left px-4 py-2 text-sm hover:bg-[#4682b4]/10 dark:hover:bg-[#4682b4]/20 transition-colors ${country.code === countryCode ? 'bg-[#4682b4]/10 dark:bg-[#4682b4]/20 font-medium' : ''}`}
                                    >
                                      <span className="text-xl mr-2">{country.flag}</span>
                                      {country.name} <span className="text-gray-500">({country.code})</span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={countryCode}
                        onChange={(e) => {
                          const value = e.target.value
                          // 只允许输入 + 和数字
                          if (/^\+?\d*$/.test(value)) {
                            setCountryCode(value.startsWith('+') ? value : '+' + value)
                          }
                        }}
                        placeholder="+86"
                        className="w-24 px-3 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-center font-mono focus:ring-2 focus:ring-[#4682b4] focus:border-transparent outline-none"
                      />
                      <input
                        ref={phoneInputRef}
                        type="text"
                        placeholder="输入号码或 +86 1234567890"
                        value={phoneNumber}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#4682b4] focus:border-transparent outline-none"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      提示：可以直接输入 +国家代码 号码，国家会自动对齐
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      id="keepSignedIn"
                      className="w-4 h-4 text-[#4682b4] border-gray-300 rounded focus:ring-[#4682b4]"
                    />
                    <label htmlFor="keepSignedIn" className="text-sm text-gray-700 dark:text-gray-300">
                      Keep me signed in
                    </label>
                  </div>

                  <Button
                    onClick={() => setStep('code')}
                    disabled={!phoneNumber || phoneNumber.replace(/\s/g, '').length < 10}
                    className="w-full bg-[#4682b4] hover:bg-[#3a6fa0] text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </Button>

                  <button
                    onClick={() => setLoginMethod('qr')}
                    className="w-full text-[#4682b4] hover:text-[#3a6fa0] font-medium text-sm"
                  >
                    Log in by QR Code
                  </button>
                </>
              )}

              {step === 'code' && (
                <>
                  <div className="text-center mb-4">
                    <p className="text-gray-700 dark:text-gray-300 mb-1">
                      {countryCode} {phoneNumber}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      We've sent the code to the <strong>Telegram</strong> app on your other device.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Code
                    </label>
                    <input
                      type="text"
                      placeholder="Code"
                      maxLength={5}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-center text-2xl tracking-widest focus:ring-2 focus:ring-[#4682b4] focus:border-transparent outline-none"
                      autoFocus
                    />
                  </div>

                  <Button
                    onClick={() => {
                      if (verificationCode.length === 5) {
                        // 检查是否需要两步验证
                        // 这里简化处理，实际应根据后端返回决定
                        setStep('password')
                      }
                    }}
                    disabled={verificationCode.length !== 5}
                    className="w-full bg-[#4682b4] hover:bg-[#3a6fa0] text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </Button>

                  <button
                    onClick={() => setStep('phone')}
                    className="w-full text-[#4682b4] hover:text-[#3a6fa0] font-medium text-sm"
                  >
                    Change phone number
                  </button>
                </>
              )}

              {step === 'password' && (
                <>
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#4682b4] to-[#5288c1] rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Two-Step Verification
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Your account is protected with an additional password
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#4682b4] focus:border-transparent outline-none"
                      autoFocus
                    />
                  </div>

                  <Button
                    onClick={() => {
                      // 验证密码并登录
                      if (onSuccess) onSuccess()
                      onClose()
                    }}
                    disabled={!password}
                    className="w-full bg-[#4682b4] hover:bg-[#3a6fa0] text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Log in
                  </Button>

                  <button
                    className="w-full text-[#4682b4] hover:text-[#3a6fa0] font-medium text-sm"
                  >
                    Forgot password?
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
