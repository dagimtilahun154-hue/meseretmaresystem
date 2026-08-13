import requests

login_res = requests.post('http://localhost:4000/api/v1/auth/login', json={'username': 'manager', 'password': '123'})
token = login_res.json().get('accessToken')
headers = {'Authorization': f'Bearer {token}'}

pumps = requests.get('http://localhost:4000/api/v1/pumps', headers=headers).json()
print('Fetched pumps from API:', len(pumps))

brands = {}
for p in pumps:
    b = p.get('brand', 'Unknown')
    brands[b] = brands.get(b, 0) + 1

print('Brands summary:', brands)

difful_pumps = [p for p in pumps if p.get('brand') == 'DIFFUL']
print(f'\nDIFFUL pumps count: {len(difful_pumps)}')
for dp in difful_pumps:
    print(f" - Model: {dp.get('model')}, Category: {dp.get('firstCategory')}, Power: {dp.get('power')}")
