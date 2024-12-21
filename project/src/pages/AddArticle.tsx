import React, { useState, useRef, useEffect } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { nanoid } from "nanoid"; // 短いユニークID生成用
import { Editor } from "@toast-ui/react-editor";
import "@toast-ui/editor/dist/toastui-editor.css";
import { useNavigate } from "react-router-dom";

import colorSyntax from "@toast-ui/editor-plugin-color-syntax";
import "@toast-ui/editor-plugin-color-syntax/dist/toastui-editor-plugin-color-syntax.css"; // 必要に応じてCSSをインポート

// Import Firebase Authentication
import { getAuth, onAuthStateChanged } from "firebase/auth";

const AddArticle = () => {
  const [title, setTitle] = useState("");
  const [username, setUsername] = useState(null); // ユーザー名を保持するステート
  const editorRef = useRef(null);
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    // 認証状態の監視
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // ユーザーがログインしている場合、表示名を取得
        setUsername(user.displayName || user.email); // 必要に応じて適切なフィールドを使用
      } else {
        // ユーザーがログアウトしている場合、適切な処理を行う
        setUsername(null);
      }
    });

    // クリーンアップ関数
    return () => unsubscribe();
  }, [auth]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username) {
      alert("記事を投稿するにはログインが必要です。");
      navigate("/login"); // ログインページにリダイレクト
      return;
    }

    try {
      const editorInstance = editorRef.current?.getInstance();
      let markdownContent = editorInstance?.getMarkdown() || "";

      // 投稿時に画像を処理
      markdownContent = await processMarkdownContent(markdownContent);

      // Firestoreに保存
      const articleRef = doc(db, "articles", title.replace(/\s+/g, "-"));
      await setDoc(articleRef, {
        title,
        content: markdownContent,
        created_at: serverTimestamp(),
        author: username, // ユーザー名を追加
      });

      alert("記事を追加しました！");
      setTitle("");
      editorInstance?.setMarkdown("");
      navigate("/"); // 投稿後にリダイレクト
    } catch (error) {
      console.error("エラー:", error);
      alert("記事の投稿に失敗しました。");
    }
  };

  /**
   * Markdownコンテンツ内のBase64画像を検出し、GitHubにアップロードしてURLを置換する
   *
   * @param {string} markdown - 元のMarkdownコンテンツ
   * @returns {string} - 画像URLが置換されたMarkdownコンテンツ
   */
  const processMarkdownContent = async (markdown) => {
    // Base64形式の画像を検出する正規表現
    const base64ImageRegex = /!\[([^\]]*)\]\((data:image\/[a-zA-Z]+;base64,([^)]+))\)/g;

    // 画像アップロードのプロミスを格納する配列
    const uploadPromises = [];

    // マッチを一時的に保存するオブジェクト
    const base64ToGitHubURLMap = {};

    let match;
    while ((match = base64ImageRegex.exec(markdown)) !== null) {
      const fullMatch = match[0];
      const altText = match[1];
      const dataUrl = match[2];
      const base64Data = match[3];

      // 同じ画像を複数回アップロードしないようにする
      if (base64ToGitHubURLMap[dataUrl]) {
        continue;
      }

      // 画像をアップロードするプロミスを作成
      const uploadPromise = (async () => {
        try {
          const imageUrl = await uploadBase64ImageToGitHub(base64Data, match[0]);
          base64ToGitHubURLMap[dataUrl] = imageUrl;
        } catch (error) {
          console.error("画像のアップロードに失敗しました:", error);
          alert("画像のアップロードに失敗しました。");
          // 投稿を中断する場合はエラーをスロー
          throw error;
        }
      })();

      uploadPromises.push(uploadPromise);
    }

    // すべての画像アップロードが完了するまで待機
    await Promise.all(uploadPromises);

    // Markdownコンテンツ内のBase64画像URLをGitHubのURLに置換
    const updatedMarkdown = markdown.replace(base64ImageRegex, (match, alt, dataUrl, base64Data) => {
      const githubUrl = base64ToGitHubURLMap[dataUrl];
      if (githubUrl) {
        return `![${alt}](${githubUrl})`;
      }
      // アップロードに失敗した場合は元のBase64画像を保持
      return match;
    });

    return updatedMarkdown;
  };

  /**
   * Base64形式の画像データをGitHubにアップロードし、URLを返す
   *
   * @param {string} base64Data - Base64形式の画像データ
   * @param {string} originalMatch - 元のMarkdown画像マッチ
   * @returns {string} - GitHubにアップロードされた画像のURL
   */
  const uploadBase64ImageToGitHub = async (base64Data, originalMatch) => {
    const GITHUB_API_URL = `https://api.github.com/repos/ganondorofu/Img_save/contents/static/images/`;
    const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
    
    // 画像の種類を判別
    const imageTypeMatch = originalMatch.match(/data:image\/([a-zA-Z]+);base64,/);
    let imageType = "png"; // デフォルトはPNG
    if (imageTypeMatch && imageTypeMatch[1]) {
      imageType = imageTypeMatch[1];
    }

    // 短いユニークIDを生成してファイル名を作成
    const id = nanoid(10); // 10文字のユニークID
    const fileName = `${id}.${imageType}`;

    // ファイルアップロード用のAPI URLを構築
    const fileApiUrl = `${GITHUB_API_URL}${fileName}`;

    // リクエストペイロードを準備
    const payload = {
      message: `Add image: ${fileName}`,
      content: base64Data,
    };

    // GitHubに画像をアップロードするリクエストを送信
    const response = await fetch(fileApiUrl, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    // GitHub上の画像URLを構築
    const imageUrl = `https://github.com/ganondorofu/Img_save/raw/main/static/images/${fileName}`;
    return imageUrl;
  };

  return (
    <div className="add-article-container">
      <h1>記事を追加</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">タイトル</label>
          <input
            type="text"
            id="title"
            placeholder="タイトル"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="content">内容 (Markdown)</label>
          <Editor
            ref={editorRef}
            initialValue="ここにMarkdownを入力"
            previewStyle="vertical"
            height="400px"
            initialEditType="wysiwyg" // WYSIWYGモードに設定
            useCommandShortcut
            // addImageBlobHookを削除
          />
        </div>
        <button type="submit" className="submit-button">
          投稿
        </button>
      </form>
    </div>
  );
};

export default AddArticle;
