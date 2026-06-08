import { Document, Page, Image, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { Story } from '@/types';

// Register a font that supports Chinese (served locally from public/fonts/)
Font.register({
  family: 'Noto Sans SC',
  src: '/fonts/NotoSansSC-Regular.ttf',
  fontStyle: 'normal',
  fontWeight: 400,
});

Font.register({
  family: 'Noto Sans SC',
  src: '/fonts/NotoSansSC-Bold.ttf',
  fontStyle: 'normal',
  fontWeight: 700,
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#fffdf7',
    fontFamily: 'Noto Sans SC',
  },
  coverPage: {
    padding: 40,
    backgroundColor: '#fffdf7',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'Noto Sans SC',
  },
  coverTitle: {
    fontSize: 36,
    fontWeight: 700,
    color: '#92400e',
    textAlign: 'center',
    marginBottom: 16,
  },
  coverMeta: {
    fontSize: 14,
    color: '#b45309',
    textAlign: 'center',
    marginBottom: 8,
  },
  imageContainer: {
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 280,
    objectFit: 'cover',
  },
  textContent: {
    fontSize: 16,
    lineHeight: 1.8,
    color: '#78350f',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  pageNumber: {
    fontSize: 10,
    color: '#d97706',
    textAlign: 'center',
    marginTop: 20,
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
  },
  placeholder: {
    width: '100%',
    height: 280,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: '#d97706',
  },
});

export function StoryPDFDocument({ story }: { story: Story }) {
  const totalPages = story.pages.length;

  return (
    <Document>
      {/* 封面 */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverTitle}>{story.title}</Text>
        <Text style={styles.coverMeta}>风格：{story.style}</Text>
        <Text style={styles.coverMeta}>适合 {story.ageRange} 岁</Text>
        <Text style={[styles.coverMeta, { marginTop: 40, fontSize: 12, color: '#d97706' }]}>
          共 {totalPages} 页
        </Text>
      </Page>

      {/* 内页 */}
      {story.pages.map((page) => (
        <Page key={page.pageNumber} size="A4" style={styles.page}>
          {page.imageUrl ? (
            <View style={styles.imageContainer}>
              <Image src={page.imageUrl} style={styles.image} />
            </View>
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>插图不可用</Text>
            </View>
          )}
          <Text style={styles.textContent}>{page.text}</Text>
          <Text style={styles.pageNumber}>
            {page.pageNumber} / {totalPages}
          </Text>
        </Page>
      ))}
    </Document>
  );
}
