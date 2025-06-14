require('dotenv').config(); // .env dosyasından secret'ları yüklemek için

const express = require('express');
const { ethers } = require("ethers");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// RPC URL (Sepolia için)
const provider = new ethers.providers.JsonRpcProvider(process.env.INFURA_SEPOLIA_URL);

// Gönderenin özel anahtarı (env dosyasından)
const privateKey = process.env.PRIVATE_KEY;
const walletSigner = new ethers.Wallet(privateKey, provider);

// Token kontrat adresi
const tokenAddress = "0xa65f224d2C41cb4dD9317Ddd3992E37B11962B58";

// ERC-20 ABI (sadece transfer fonksiyonu için)
const abi = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function balanceOf(address account) view returns (uint256)"
];

const tokenContract = new ethers.Contract(tokenAddress, abi, walletSigner);

// Token gönderme fonksiyonu
async function sendToken(to, amount) {
  try {
    console.log(`Token gönderiliyor: ${amount} MTT => ${to}`);
    
    const balance = await tokenContract.balanceOf(walletSigner.address);
    console.log("MTT bakiyesi:", ethers.utils.formatUnits(balance, 18));
    const numberOfTokens = ethers.utils.parseUnits(amount.toString(), 18);
    const tx = await tokenContract.transfer(to, numberOfTokens);
    console.log("Transaction hash:", tx.hash);
    await tx.wait();
    console.log("Transfer complete");
    return tx.hash;
  } catch (error) {
    console.error("Transfer failed:", error);
    throw error;
  }
}

// API endpoint
app.post('/submit-score', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(403).json({ error: 'Yetkisiz erişim! API anahtarı geçersiz.' });
  }
  
  const { wallet, score } = req.body;

  if (!wallet || !score) {
    return res.status(400).json({ error: 'Eksik parametre!' });
  }

  // Token miktarını hesapla (örnek: 1 skor = 5 token)
  const tokenAmount = score;

  console.log(`Wallet: ${wallet}, Score: ${score}, Token gönderiliyor: ${tokenAmount}`);

  try {
    const txHash = await sendToken(wallet, tokenAmount);
    return res.json({ 
      message: 'Score başarıyla alındı ve token transferi gerçekleştirildi!', 
      wallet, 
      score, 
      tokenAmount,
      transactionHash: txHash
    });
  } catch (error) {
    return res.status(500).json({ error: 'Token transferi başarısız oldu.' });
  }
});

app.listen(port, () => {
  console.log(`Server ${port} portunda çalışıyor`);
});
