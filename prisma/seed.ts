// prisma/seed.ts
import { PrismaClient, AdminRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
	console.log('Seeding database...')

	// Create default super admin
	const existingAdmin = await prisma.admin.findUnique({
		where: { username: 'admin' },
	})

	if (!existingAdmin) {
		const hashedPassword = await bcrypt.hash('admin', 12)
		await prisma.admin.create({
			data: {
				username: 'admin',
				email: 'admin@lmeoccasions.com',
				password: hashedPassword,
				role: AdminRole.SUPER_ADMIN,
				mustChangePassword: true,
				isActive: true,
			},
		})
		console.log('Default admin created: username=admin, password=admin')
		console.log('Change password immediately on first login!')
	} else {
		console.log('Default admin already exists, skipping.')
	}

	// Seed sample cars for demo
	const carsCount = await prisma.car.count()
	if (carsCount === 0) {
		await prisma.car.createMany({
			data: [
				{
					title: 'Mercedes-Benz Classe C 200 AMG Line',
					brand: 'Mercedes-Benz',
					model: 'Classe C',
					year: 2021,
					mileage: 42000,
					price: 28500,
					description:
						'Magnifique Mercedes Classe C en parfait état. Finition AMG Line avec pack Night. Intérieur cuir noir, toit panoramique, système MBUX, caméra de recul, aide au stationnement avant et arrière. Véhicule de 2ème main, carnet d\'entretien complet chez Mercedes.',
					mainImage: 'https://images.unsplash.com/photo-1563720360172-67b8f3dce741?w=800',
					images: [
						'https://images.unsplash.com/photo-1563720360172-67b8f3dce741?w=800',
						'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800',
					],
					equipments: [
						'Toit panoramique',
						'Sièges cuir chauffants',
						'Navigation MBUX',
						'Caméra 360°',
						'Phares LED',
						'Pack AMG Line',
						'Jantes 18"',
						'Bluetooth',
					],
					status: 'AVAILABLE',
					isFeatured: true,
					transmission: 'AUTOMATIC',
					fuelType: 'GASOLINE',
					color: 'Noir Obsidienne',
					engineSize: '1.5T 184ch',
					seats: 5,
					doors: 4,
					allowInstallment: true,
				},
				{
					title: 'BMW Série 3 320d M Sport',
					brand: 'BMW',
					model: 'Série 3',
					year: 2020,
					mileage: 65000,
					price: 24900,
					description:
						'BMW Série 3 320d en finition M Sport. Berline sportive et élégante, entretenue régulièrement. Pack M Sport intérieur et extérieur, jantes M 18 pouces, sièges sport, instrumentation numérique.',
					mainImage: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800',
					images: ['https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800'],
					equipments: [
						'Pack M Sport',
						'Écran tactile 10.25"',
						'Sièges sport électriques',
						'Phares LED adaptatifs',
						'Head-Up Display',
						'Pack Confort',
					],
					status: 'AVAILABLE',
					isFeatured: true,
					transmission: 'AUTOMATIC',
					fuelType: 'DIESEL',
					color: 'Blanc Alpinweiss',
					engineSize: '2.0D 190ch',
					seats: 5,
					doors: 4,
					allowInstallment: true,
				},
				{
					title: 'Volkswagen Golf 8 GTI',
					brand: 'Volkswagen',
					model: 'Golf 8',
					year: 2022,
					mileage: 18000,
					price: 31500,
					description:
						'Golf 8 GTI quasi neuve. Moteur TSI 245ch, boîte DSG7. Performance et confort au quotidien. Toutes options.',
					mainImage: 'https://images.unsplash.com/photo-1471444928139-48c5bf5173f8?w=800',
					images: ['https://images.unsplash.com/photo-1471444928139-48c5bf5173f8?w=800'],
					equipments: [
						'Moteur 245ch DSG7',
						'IQ.Drive',
						'Climatisation 3 zones',
						'Écran 10"',
						'App Connect',
						'Jantes GTI 18"',
					],
					status: 'RESERVED',
					isFeatured: false,
					transmission: 'AUTOMATIC',
					fuelType: 'GASOLINE',
					color: 'Gris Nardo',
					engineSize: '2.0 TSI 245ch',
					seats: 5,
					doors: 5,
					allowInstallment: false,
				},
			],
		})
		console.log('Sample cars created')
	}

	console.log('Seeding complete!')
}

main()
	.catch((e) => {
		console.error('Seed error:', e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
