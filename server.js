// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 관리자 비밀번호 설정 - 실제 운영 환경에서는 환경 변수로 관리하는 것이 좋습니다.
const ADMIN_PASSWORD = '7628';

// 데이터 저장 경로
const DATA_DIR = path.join(__dirname, 'data');
const DANGER_ZONES_FILE = path.join(DATA_DIR, 'danger_zones.json');
const SHELTERS_FILE = path.join(DATA_DIR, 'shelters.json');

// 데이터 디렉토리가 없으면 생성
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 파일이 없으면 빈 배열로 초기화
if (!fs.existsSync(DANGER_ZONES_FILE)) {
    fs.writeFileSync(DANGER_ZONES_FILE, '[]', 'utf8');
}

if (!fs.existsSync(SHELTERS_FILE)) {
    fs.writeFileSync(SHELTERS_FILE, '[]', 'utf8');
}

// 미들웨어 설정
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// 관리자 비밀번호 확인 미들웨어
const checkAdminPassword = (req, res, next) => {
    const adminPassword = req.headers['x-admin-password'];
    
    if (!adminPassword || adminPassword !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized - Invalid admin password' });
    }
    
    next();
};

// 위험 지역 전체 조회
app.get('/api/danger-zones', (req, res) => {
    try {
        const data = fs.readFileSync(DANGER_ZONES_FILE, 'utf8');
        const dangerZones = JSON.parse(data);
        res.json(dangerZones);
    } catch (error) {
        console.error('Error reading danger zones:', error);
        res.status(500).json({ error: 'Failed to load danger zones' });
    }
});

// 위험 지역 추가
app.post('/api/danger-zones', (req, res) => {
    try {
        const dangerZone = {
            id: uuidv4(),
            ...req.body,
            createdAt: new Date().toISOString()
        };
        
        const data = fs.readFileSync(DANGER_ZONES_FILE, 'utf8');
        const dangerZones = JSON.parse(data);
        
        dangerZones.push(dangerZone);
        
        fs.writeFileSync(DANGER_ZONES_FILE, JSON.stringify(dangerZones, null, 2), 'utf8');
        
        res.status(201).json(dangerZone);
    } catch (error) {
        console.error('Error saving danger zone:', error);
        res.status(500).json({ error: 'Failed to save danger zone' });
    }
});

// 위험 지역 상세 조회
app.get('/api/danger-zones/:id', (req, res) => {
    try {
        const data = fs.readFileSync(DANGER_ZONES_FILE, 'utf8');
        const dangerZones = JSON.parse(data);
        
        const dangerZone = dangerZones.find(zone => zone.id === req.params.id);
        
        if (!dangerZone) {
            return res.status(404).json({ error: 'Danger zone not found' });
        }
        
        res.json(dangerZone);
    } catch (error) {
        console.error('Error fetching danger zone:', error);
        res.status(500).json({ error: 'Failed to fetch danger zone' });
    }
});

// 위험 지역 삭제
app.delete('/api/danger-zones/:id', checkAdminPassword, (req, res) => {
    try {
        const data = fs.readFileSync(DANGER_ZONES_FILE, 'utf8');
        let dangerZones = JSON.parse(data);
        
        const index = dangerZones.findIndex(zone => zone.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Danger zone not found' });
        }
        
        const deletedZone = dangerZones[index];
        dangerZones.splice(index, 1);
        
        fs.writeFileSync(DANGER_ZONES_FILE, JSON.stringify(dangerZones, null, 2), 'utf8');
        
        // 소켓으로 삭제 알림 브로드캐스팅
        io.emit('danger-deleted', deletedZone.id);
        
        res.json({ message: 'Danger zone deleted successfully' });
    } catch (error) {
        console.error('Error deleting danger zone:', error);
        res.status(500).json({ error: 'Failed to delete danger zone' });
    }
});

// 대피소 전체 조회
app.get('/api/shelters', (req, res) => {
    try {
        const data = fs.readFileSync(SHELTERS_FILE, 'utf8');
        const shelters = JSON.parse(data);
        res.json(shelters);
    } catch (error) {
        console.error('Error reading shelters:', error);
        res.status(500).json({ error: 'Failed to load shelters' });
    }
});

// 대피소 추가
app.post('/api/shelters', (req, res) => {
    try {
        const shelter = {
            id: uuidv4(),
            ...req.body,
            createdAt: new Date().toISOString()
        };
        
        const data = fs.readFileSync(SHELTERS_FILE, 'utf8');
        const shelters = JSON.parse(data);
        
        shelters.push(shelter);
        
        fs.writeFileSync(SHELTERS_FILE, JSON.stringify(shelters, null, 2), 'utf8');
        
        res.status(201).json(shelter);
    } catch (error) {
        console.error('Error saving shelter:', error);
        res.status(500).json({ error: 'Failed to save shelter' });
    }
});

// 대피소 상세 조회
app.get('/api/shelters/:id', (req, res) => {
    try {
        const data = fs.readFileSync(SHELTERS_FILE, 'utf8');
        const shelters = JSON.parse(data);
        
        const shelter = shelters.find(s => s.id === req.params.id);
        
        if (!shelter) {
            return res.status(404).json({ error: 'Shelter not found' });
        }
        
        res.json(shelter);
    } catch (error) {
        console.error('Error fetching shelter:', error);
        res.status(500).json({ error: 'Failed to fetch shelter' });
    }
});

// 대피소 삭제
app.delete('/api/shelters/:id', checkAdminPassword, (req, res) => {
    try {
        const data = fs.readFileSync(SHELTERS_FILE, 'utf8');
        let shelters = JSON.parse(data);
        
        const index = shelters.findIndex(s => s.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Shelter not found' });
        }
        
        const deletedShelter = shelters[index];
        shelters.splice(index, 1);
        
        fs.writeFileSync(SHELTERS_FILE, JSON.stringify(shelters, null, 2), 'utf8');
        
        // 소켓으로 삭제 알림 브로드캐스팅
        io.emit('shelter-deleted', deletedShelter.id);
        
        res.json({ message: 'Shelter deleted successfully' });
    } catch (error) {
        console.error('Error deleting shelter:', error);
        res.status(500).json({ error: 'Failed to delete shelter' });
    }
});

// 웹소켓을 통한 실시간 업데이트 설정
const http = require('http');
const socketIo = require('socket.io');
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 소켓 연결 처리
io.on('connection', (socket) => {
    console.log('New client connected');
    
    // 위험 지역 추가 이벤트를 모든 클라이언트에 브로드캐스트
    socket.on('new-danger', (dangerZone) => {
        socket.broadcast.emit('danger-added', dangerZone);
    });
    
    // 대피소 추가 이벤트를 모든 클라이언트에 브로드캐스트
    socket.on('new-shelter', (shelter) => {
        socket.broadcast.emit('shelter-added', shelter);
    });
    
    // 연결 해제
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// 서버 시작
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});