#!/bin/bash
# download-photos.sh — compatível com Mac (bash 3)
mkdir -p img

download() {
  echo "⬇ $1..."
  curl -L -s -A "ViajarSemDestino/1.0" -o "img/$1.jpg" "$2"
  SIZE=$(wc -c < "img/$1.jpg")
  if [ "$SIZE" -gt 10000 ]; then
    echo "  ✓ $1.jpg ($(echo $SIZE/1024 | bc)KB)"
  else
    echo "  ✗ $1 falhou"
  fi
}

download "florianopolis"    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Ponte_Herc%C3%ADlio_Luz_em_Florian%C3%B3polis%2C_Santa_Catarina%2C_Brasil.JPG/800px-Ponte_Herc%C3%ADlio_Luz_em_Florian%C3%B3polis%2C_Santa_Catarina%2C_Brasil.JPG"
download "rio-de-janeiro"   "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Rio_de_Janeiro_luc_viatour.jpg/800px-Rio_de_Janeiro_luc_viatour.jpg"
download "sao-paulo"        "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Sao-paulo-skyline.jpg/800px-Sao-paulo-skyline.jpg"
download "fortaleza"        "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Praia_de_Iracema_-_Fortaleza.jpg/800px-Praia_de_Iracema_-_Fortaleza.jpg"
download "foz-do-iguacu"    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Iguazu_cataratas.jpg/800px-Iguazu_cataratas.jpg"
download "salvador"         "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Pelourinho_-_Salvador_Bahia.jpg/800px-Pelourinho_-_Salvador_Bahia.jpg"
download "recife"           "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Marco_Zero_Recife.jpg/800px-Marco_Zero_Recife.jpg"
download "manaus"           "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Teatro_Amazonas_-_Manaus.jpg/800px-Teatro_Amazonas_-_Manaus.jpg"
download "buenos-aires"     "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Buenos_Aires_-_Obelisco.jpg/800px-Buenos_Aires_-_Obelisco.jpg"
download "santiago"         "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Santiago_desde_cerro_san_cristobal.jpg/800px-Santiago_desde_cerro_san_cristobal.jpg"
download "montevideu"       "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Montevideo_Rambla.jpg/800px-Montevideo_Rambla.jpg"
download "cancun"           "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Cancun_Mexico.jpg/800px-Cancun_Mexico.jpg"
download "miami"            "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Miami_skyline_at_night.jpg/800px-Miami_skyline_at_night.jpg"
download "lisboa"           "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Lisbon_%28Portugal%29%2C_October_2017_%2814%29.jpg/800px-Lisbon_%28Portugal%29%2C_October_2017_%2814%29.jpg"
download "roma"             "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Colosseo_2020.jpg/800px-Colosseo_2020.jpg"
download "barcelona"        "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Sagrada_Familia_01.jpg/800px-Sagrada_Familia_01.jpg"
download "bogota"           "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Bogot%C3%A1_-_Colombia.jpg/800px-Bogot%C3%A1_-_Colombia.jpg"
download "cidade-do-panama" "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Panama_City_Skyline.jpg/800px-Panama_City_Skyline.jpg"

echo ""
echo "✓ Concluído! $(ls img/*.jpg 2>/dev/null | wc -l | tr -d ' ') fotos na pasta img/"
